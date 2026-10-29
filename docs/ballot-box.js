// Equity Lens - client ballot adapter
//
// The rest of the app talks to the server only through this file:
//
//   openSession(quorum)          chair only, returns one seat link per member
//   joinFromUrl()                member, consumes a seat link on page load
//   publishRoster(candidates)    chair only, encrypted before it leaves here
//   fetchRoster()                member, decrypts with the key from the link
//   castBallot(candidateId)      one seat, once
//   status()                     how many ballots are in, nothing about content
//   tally()                      chair only, refused until every seat has voted
//   erase()                      chair only, Art. 17 right to erasure
//
// Swapping the backend later means replacing this file and nothing else.

// ---------------------------------------------------------------------------
// CHANGE THIS to your own Worker address after deploying (see SETUP.md step 5).
const API = 'https://equity-lens-ballots.YOUR-SUBDOMAIN.workers.dev';
// ---------------------------------------------------------------------------

const LOCAL = {
  session: 'equityLens.sessionId',
  seat: 'equityLens.seatToken',
  chair: 'equityLens.chairToken',
  key: 'equityLens.roomKey',
};

// --- encryption -------------------------------------------------------------
// The room key is generated in the chair's browser and travels to members in
// the fragment of the seat link (the part after #), which browsers never send
// to a server. Cloudflare therefore stores ciphertext it has no key for.

function b64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function unb64url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function newRoomKey() {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  return b64url(await crypto.subtle.exportKey('raw', key));
}

async function importKey(rawB64) {
  return crypto.subtle.importKey('raw', unb64url(rawB64), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

async function encrypt(plainObject, rawB64) {
  const key = await importKey(rawB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(plainObject));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return b64url(iv) + '.' + b64url(ct);
}

async function decrypt(payload, rawB64) {
  const [ivPart, ctPart] = String(payload).split('.');
  const key = await importKey(rawB64);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64url(ivPart) },
    key,
    unb64url(ctPart),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

// --- transport --------------------------------------------------------------

async function call(path, { method = 'GET', body, chairToken } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (chairToken) headers['X-Chair-Token'] = chairToken;

  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error('Could not reach the voting server. Check your connection.');
  }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// --- public interface -------------------------------------------------------

export const BallotBox = {
  sessionId() {
    return sessionStorage.getItem(LOCAL.session);
  },

  isChair() {
    return Boolean(sessionStorage.getItem(LOCAL.chair));
  },

  hasSeat() {
    return Boolean(sessionStorage.getItem(LOCAL.seat));
  },

  async openSession(quorum) {
    const { ok, data } = await call('/api/sessions', {
      method: 'POST',
      body: { quorum },
    });
    if (!ok) throw new Error(data.error || 'Could not open the session.');

    const roomKey = await newRoomKey();
    sessionStorage.setItem(LOCAL.session, data.sessionId);
    sessionStorage.setItem(LOCAL.chair, data.chairToken);
    sessionStorage.setItem(LOCAL.key, roomKey);

    const base = location.origin + location.pathname;
    return {
      sessionId: data.sessionId,
      seatLinks: data.seatTokens.map(
        // Everything a seat needs lives in the fragment. Browsers never send the
        // fragment to any server, so neither the static host nor a proxy ever
        // sees a seat token or the room key in a request or an access log.
        (t) => `${base}#session=${data.sessionId}&seat=${t}&k=${roomKey}`,
      ),
    };
  },

  joinFromUrl() {
    const frag = new URLSearchParams(location.hash.slice(1));
    // Links issued before build 2026-10-29 carried session and seat in the
    // query string. Accept them so a session in progress is not broken.
    const query = new URLSearchParams(location.search);
    const session = frag.get('session') || query.get('session');
    const seat = frag.get('seat') || query.get('seat');
    const key = frag.get('k');
    if (!session || !seat || !key) return false;

    sessionStorage.setItem(LOCAL.session, session);
    sessionStorage.setItem(LOCAL.seat, seat);
    sessionStorage.setItem(LOCAL.key, key);

    // Strip the tokens from the address bar so they do not survive in history,
    // in a screenshot, or on a shared screen.
    history.replaceState({}, '', location.pathname);
    return true;
  },

  async publishRoster(candidates) {
    const chairToken = sessionStorage.getItem(LOCAL.chair);
    const roomKey = sessionStorage.getItem(LOCAL.key);
    const session = this.sessionId();
    if (!session || !chairToken) throw new Error('Only the chair can publish the list.');

    const ciphertext = await encrypt(candidates, roomKey);
    const { ok, data } = await call(`/api/sessions/${session}/roster`, {
      method: 'POST',
      body: { ciphertext },
      chairToken,
    });
    if (!ok) throw new Error(data.error || 'Could not publish the candidate list.');
    return true;
  },

  async fetchRoster() {
    const session = this.sessionId();
    const roomKey = sessionStorage.getItem(LOCAL.key);
    if (!session || !roomKey) return null;

    const { ok, status, data } = await call(`/api/sessions/${session}/roster`);
    if (status === 404) return null;
    if (!ok) throw new Error(data.error || 'Could not load the candidate list.');
    try {
      return await decrypt(data.ciphertext, roomKey);
    } catch (err) {
      throw new Error('Could not decrypt the candidate list. The link may be incomplete.');
    }
  },

  async castBallot(candidateId) {
    const session = this.sessionId();
    const seatToken = sessionStorage.getItem(LOCAL.seat);
    if (!session || !seatToken) throw new Error('You need a seat link to vote.');

    const { ok, status, data } = await call(`/api/sessions/${session}/ballots`, {
      method: 'POST',
      body: { seatToken, candidateId },
    });
    if (status === 409) return { recorded: false, reason: 'already voted' };
    if (!ok) throw new Error(data.error || 'Ballot refused.');
    return { recorded: true };
  },

  async status() {
    const session = this.sessionId();
    if (!session) return null;
    const { ok, data } = await call(`/api/sessions/${session}/status`);
    return ok ? data : null;
  },

  // Returns { sealed: true } until every seat has voted. The caller shows
  // "n of q ballots in" and nothing more, because a running total is enough to
  // deduce an individual vote.
  async tally() {
    const session = this.sessionId();
    const chairToken = sessionStorage.getItem(LOCAL.chair);
    if (!session || !chairToken) throw new Error('Only the chair can see results.');

    const { ok, status, data } = await call(`/api/sessions/${session}/tally`, {
      chairToken,
    });
    if (status === 423) return { sealed: true, cast: data.cast, quorum: data.quorum };
    if (!ok) throw new Error(data.error || 'Results unavailable.');
    return data;
  },

  async erase() {
    const session = this.sessionId();
    const chairToken = sessionStorage.getItem(LOCAL.chair);
    if (session) await call(`/api/sessions/${session}`, { method: 'DELETE', chairToken });
    Object.values(LOCAL).forEach((k) => sessionStorage.removeItem(k));
  },

  // --- open benchmark archive ---------------------------------------------
  // Records sent here are anonymous by construction and carry no reference to
  // the session they came from. The server refuses anything outside its schema.

  async contribute(record) {
    const { ok, data } = await call('/api/archive/contribute', {
      method: 'POST',
      body: { record },
    });
    if (!ok) throw new Error(data.error || 'The record was refused.');

    const session = this.sessionId();
    const chairToken = sessionStorage.getItem(LOCAL.chair);
    if (session) {
      await call(`/api/sessions/${session}/contributed`, { method: 'POST', chairToken });
    }
    return true;
  },

  async archiveStats() {
    const { ok, data } = await call('/api/archive/stats');
    return ok ? data : null;
  },
};
