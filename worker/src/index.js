// Equity Lens - ballot API
//
// Design constraint (spec R3.1): the pairing between a seat and a candidate is
// never written to storage. A ballot is applied as one transaction that marks a
// seat used AND increments a candidate counter. Neither table records the other.
// Reading the whole database cannot reconstruct who voted for whom.
//
// Candidate identifiers arriving here are opaque client-side ids. Candidate
// names, institutions, genders and h-indices never leave the browser.

const ALLOWED_ORIGINS = [
  'https://akc-equity-lens.github.io',
  'http://localhost:8080',
];

function cors(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Chair-Token',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

function randomToken(bytes = 16) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class BallotBox {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS seats (
        token_hash TEXT PRIMARY KEY,
        used INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS tally (
        candidate_id TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS roster (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        ciphertext TEXT NOT NULL
      );
    `);
  }

  meta(key) {
    const row = this.sql.exec('SELECT value FROM meta WHERE key = ?', key).toArray()[0];
    return row ? row.value : null;
  }

  setMeta(key, value) {
    this.sql.exec(
      'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      String(value),
    );
  }

  counts() {
    const cast = this.sql.exec('SELECT COUNT(*) AS n FROM seats WHERE used = 1').toArray()[0].n;
    const quorum = parseInt(this.meta('quorum') || '0', 10);
    return { cast, quorum, sealed: cast < quorum };
  }

  async open(quorum) {
    if (this.meta('quorum')) return { error: 'session already open' };
    const chairToken = randomToken();
    const seatTokens = Array.from({ length: quorum }, () => randomToken());
    const chairHash = await hashToken(chairToken);
    const seatHashes = await Promise.all(seatTokens.map(hashToken));

    this.ctx.storage.transactionSync(() => {
      this.setMeta('quorum', quorum);
      this.setMeta('chair_hash', chairHash);
      this.setMeta('opened_at', new Date().toISOString());
      for (const hash of seatHashes) {
        this.sql.exec('INSERT INTO seats (token_hash, used) VALUES (?, 0)', hash);
      }
    });

    return { chairToken, seatTokens };
  }

  async castBallot(seatToken, candidateId) {
    if (!this.meta('quorum')) return { status: 404, body: { error: 'no such session' } };
    if (typeof candidateId !== 'string' || !/^[a-z0-9_-]{1,64}$/i.test(candidateId)) {
      return { status: 400, body: { error: 'invalid candidate id' } };
    }
    const hash = await hashToken(String(seatToken || ''));

    let outcome;
    this.ctx.storage.transactionSync(() => {
      const seat = this.sql.exec('SELECT used FROM seats WHERE token_hash = ?', hash).toArray()[0];
      if (!seat) {
        outcome = { status: 403, body: { error: 'unrecognised seat token' } };
        return;
      }
      if (seat.used === 1) {
        outcome = { status: 409, body: { error: 'this seat has already voted' } };
        return;
      }
      // These two statements are the whole privacy design. They run together and
      // reference each other nowhere.
      this.sql.exec('UPDATE seats SET used = 1 WHERE token_hash = ?', hash);
      this.sql.exec(
        'INSERT INTO tally (candidate_id, count) VALUES (?, 1) ON CONFLICT(candidate_id) DO UPDATE SET count = count + 1',
        candidateId,
      );
      outcome = { status: 201, body: { recorded: true } };
    });

    return outcome;
  }

  async tally(chairToken) {
    const expected = this.meta('chair_hash');
    if (!expected) return { status: 404, body: { error: 'no such session' } };
    if ((await hashToken(String(chairToken || ''))) !== expected) {
      return { status: 403, body: { error: 'chair token required' } };
    }
    const state = this.counts();
    if (state.sealed) {
      // Withheld deliberately: revealing a running total lets an observer diff
      // it across two ballots and deduce an individual vote.
      return { status: 423, body: { sealed: true, ...state } };
    }
    const results = this.sql
      .exec('SELECT candidate_id, count FROM tally ORDER BY candidate_id')
      .toArray();
    return { status: 200, body: { sealed: false, ...state, results } };
  }

  // The candidate list arrives already encrypted by the chair's browser. This
  // server has no key and cannot read it. Do not add a decryption path here.
  async putRoster(chairToken, ciphertext) {
    const expected = this.meta('chair_hash');
    if (!expected) return { status: 404, body: { error: 'no such session' } };
    if ((await hashToken(String(chairToken || ''))) !== expected) {
      return { status: 403, body: { error: 'chair token required' } };
    }
    if (typeof ciphertext !== 'string' || ciphertext.length > 400000) {
      return { status: 400, body: { error: 'invalid roster' } };
    }
    this.sql.exec(
      'INSERT INTO roster (id, ciphertext) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET ciphertext = excluded.ciphertext',
      ciphertext,
    );
    return { status: 200, body: { published: true } };
  }

  getRoster() {
    const row = this.sql.exec('SELECT ciphertext FROM roster WHERE id = 1').toArray()[0];
    if (!row) return { status: 404, body: { error: 'no roster published yet' } };
    return { status: 200, body: { ciphertext: row.ciphertext } };
  }

  async erase(chairToken) {
    const expected = this.meta('chair_hash');
    if (expected && (await hashToken(String(chairToken || ''))) !== expected) {
      return { status: 403, body: { error: 'chair token required' } };
    }
    this.ctx.storage.deleteAll();
    return { status: 200, body: { erased: true } };
  }

  async fetch(request) {
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();
    const chairToken = request.headers.get('X-Chair-Token');

    if (action === 'open') {
      const { quorum } = await request.json();
      const n = parseInt(quorum, 10);
      if (!Number.isInteger(n) || n < 2 || n > 50) {
        return Response.json({ error: 'quorum must be between 2 and 50' }, { status: 400 });
      }
      const result = await this.open(n);
      return Response.json(result, { status: result.error ? 409 : 201 });
    }

    if (action === 'ballots') {
      const { seatToken, candidateId } = await request.json();
      const out = await this.castBallot(seatToken, candidateId);
      return Response.json(out.body, { status: out.status });
    }

    if (action === 'status') {
      if (!this.meta('quorum')) return Response.json({ error: 'no such session' }, { status: 404 });
      return Response.json(this.counts(), { status: 200 });
    }

    if (action === 'tally') {
      const out = await this.tally(chairToken);
      return Response.json(out.body, { status: out.status });
    }

    if (action === 'roster') {
      if (request.method === 'POST') {
        const { ciphertext } = await request.json();
        const out = await this.putRoster(chairToken, ciphertext);
        return Response.json(out.body, { status: out.status });
      }
      const out = this.getRoster();
      return Response.json(out.body, { status: out.status });
    }

    if (action === 'erase') {
      const out = await this.erase(chairToken);
      return Response.json(out.body, { status: out.status });
    }

    return Response.json({ error: 'unknown action' }, { status: 404 });
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    // POST /api/sessions            -> open a session
    // POST /api/sessions/:id/ballots
    // GET  /api/sessions/:id/status
    // GET  /api/sessions/:id/tally
    // DELETE /api/sessions/:id
    if (parts[0] !== 'api' || parts[1] !== 'sessions') {
      return json({ error: 'not found' }, 404, origin);
    }

    // Pinned to the EU so ballots are stored and processed inside the region.
    const ns = env.BALLOT_BOX.jurisdiction('eu');

    if (parts.length === 2 && request.method === 'POST') {
      const sessionId = randomToken(8);
      const stub = ns.get(ns.idFromName(sessionId));
      const res = await stub.fetch(new Request('https://do/open', request));
      const body = await res.json();
      return json({ sessionId, ...body }, res.status, origin);
    }

    const sessionId = parts[2];
    if (!sessionId || !/^[a-f0-9]{16}$/.test(sessionId)) {
      return json({ error: 'invalid session id' }, 400, origin);
    }
    const stub = ns.get(ns.idFromName(sessionId));

    const route =
      request.method === 'DELETE' && parts.length === 3
        ? 'erase'
        : parts[3];

    if (!['ballots', 'status', 'tally', 'roster', 'erase'].includes(route)) {
      return json({ error: 'not found' }, 404, origin);
    }

    const res = await stub.fetch(new Request(`https://do/${route}`, request));
    return json(await res.json(), res.status, origin);
  },
};
