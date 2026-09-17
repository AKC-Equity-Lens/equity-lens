# Deploying your own instance

Equity Lens has two halves, deployed to two places:

- **`docs/`** — the committee-facing interface. Static files, served by GitHub
  Pages or any web server.
- **`worker/`** — the ballot box. A small Cloudflare Worker that counts votes
  and holds the encrypted candidate list while a session is open.

They are separate because a static host cannot run code, and counting ballots
needs code running somewhere neutral.

You do not need to deploy anything to try the tool — there is a hosted instance
linked from the README. Deploy your own if your institution needs the data under
its own control, or if you want to modify the tool.

> **If you self-host, your organisation is the data controller** for the
> candidate data your committees enter. You are responsible for informing
> candidates that their data is being processed, for your legal basis, and for
> retention. See the privacy notice inside the application.

---

## 1. Prerequisites

- A [Cloudflare](https://dash.cloudflare.com/sign-up) account. The free plan is
  sufficient; no domain name is required.
- [Node.js](https://nodejs.org) 20 or later, for Cloudflare's deployment tool.

Check Node with:

```bash
node --version
```

## 2. Get the code

```bash
git clone https://github.com/AKC-Equity-Lens/equity-lens.git
cd equity-lens
```

Or download the ZIP from the repository's **Code** button and extract it.

## 3. Deploy the ballot box

```bash
cd worker
npx wrangler login      # opens a browser to authorise
npx wrangler whoami     # confirm you are on the intended account
npx wrangler deploy
```

Wrangler prints the Worker's address, ending in `.workers.dev`. Keep it.

If your Cloudflare login covers more than one account, add the target account's
identifier to `wrangler.toml`:

```toml
account_id = "your-account-id"
```

You will find it in the URL of your Cloudflare dashboard.

### Notes on the Worker

- It uses a **Durable Object with SQLite storage**, which gives atomic
  transactions. Workers KV is eventually consistent and would silently lose a
  vote when two members submit at the same moment. Do not substitute it.
- The object is pinned to the **EU jurisdiction**, so ballots are processed and
  stored in the region. The object's random identifier is logged outside that
  jurisdiction for billing and diagnostics; it contains no personal data. Record
  this in your data protection assessment.
- **Do not enable Cloudflare Access on this Worker.** Access requires a
  Cloudflare login before any request reaches it, which would stop committee
  members voting. Security here comes from single-use seat tokens.

## 4. Publish the interface

With GitHub Pages: in your fork, go to **Settings → Pages**, set the source to
the `main` branch and the `/docs` folder, and save. Your address will be
`https://<your-account>.github.io/<repo>/`.

Any static host works equally well. The interface must be **served over HTTP(S)**
— opening `index.html` from disk will not work, because it loads ES modules.

## 5. Connect the two halves

Two edits, one on each side.

**In `docs/ballot-box.js`**, set the Worker address from step 3:

```js
const API = 'https://equity-lens-ballots.YOUR-SUBDOMAIN.workers.dev';
```

**In `worker/src/index.js`**, add the origin serving your interface:

```js
const ALLOWED_ORIGINS = [
  'https://your-account.github.io',
  'http://localhost:8080',
];
```

Origin only — no repository path, no trailing slash. Then redeploy the Worker
(`npx wrangler deploy`) and publish the updated interface.

This step is where most deployments go wrong. If the application reports that it
cannot reach the voting server, check both values character by character.

## 6. Test before using it for a real decision

You need two browser contexts so that two "people" can hold different seats — a
normal window and a private window, or two different browsers.

1. Open your instance. Set the number of voting members to **2** and open a
   session as chair.
2. Copy the two seat links.
3. Add two candidates with different institutions and genders, so the checks have
   something to work with.
4. Publish the list.
5. Open seat link 1 in the second context and vote.
6. Back in the chair window, press **Refresh** in the Ballot box section.

It must read *Sealed. 1 of 2 ballots received.* If it shows vote totals at that
point, stop and report it — the seal is the core of the privacy design. See
`SECURITY.md`.

Then vote from seat link 2 and confirm results appear.

## 7. Verify the privacy properties yourself

Worth doing once, because the claim is only as good as the check.

In the Cloudflare dashboard, open your Worker's Durable Object and inspect the
tables. You will find:

- `seats` — hashed seat tokens and whether each has voted
- `tally` — a candidate identifier and a count
- `roster` — an unreadable block of ciphertext

There is no column anywhere joining a seat to a ballot. That absence is the
guarantee: the question "who voted for whom" has no answer in this schema. The
`roster` text is the encrypted candidate list; the key never left the chair's
browser.

## Costs

Nothing at committee scale. The Workers free plan includes Durable Objects with
SQLite storage, and free-plan accounts are not charged for that storage. A
session writes a handful of rows.

## Local development

```bash
cd docs && python3 -m http.server 8080
```

Then open `http://localhost:8080`. Add `http://localhost:8080` to
`ALLOWED_ORIGINS` and redeploy the Worker if you want the ballot box to answer a
local interface.

There is no build step and nothing to install for the interface — deliberately,
so that what you review is exactly what runs.
