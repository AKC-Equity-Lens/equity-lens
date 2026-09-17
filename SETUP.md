# Equity Lens v0.2 — setup guide

Written for the AKC-Equity-Lens repository as it stands today: `index.html` and
`README.md` at the root, GitHub Pages already running, and a Cloudflare account
that already holds an unrelated Worker.

Nothing here overwrites either of those.

The new version has two halves deployed to two places:

- `docs/` — the page committees open. Goes to **GitHub Pages**.
- `worker/` — the ballot box. Goes to **Cloudflare Workers**.

They are separate because GitHub Pages can only serve files. It cannot run code,
and counting ballots needs code running somewhere neutral.

---

## Step 1 — Snapshot v0.1 first

Two minutes, and after this nothing you do can lose the current version.

1. In the repository, click **Releases** in the right sidebar (it says "No
   releases published").
2. Click **Create a new release**.
3. Click **Choose a tag**, type `v0.1`, then click **Create new tag on publish**.
4. Title it `v0.1 — workshop prototype`.
5. Click **Publish release**.

You now have a permanent, downloadable snapshot of the exact code you showed at
the Geneva side event. It cannot be changed by anything that follows.

---

## Step 2 — Upload the new files

Do **not** upload anything to the repository root. The new app lives in its own
folder, so your existing `index.html` stays exactly where it is.

1. On the repository page, click **Add file → Upload files**.
2. Drag in the `docs` folder and the `worker` folder.
3. Scroll down, type a message like `Add v0.2 app and ballot worker`.
4. Click **Commit changes**.

The repository should now look like this:

```
equity-lens/
├─ README.md          (unchanged)
├─ index.html         (unchanged — this is v0.1)
├─ SETUP.md
├─ docs/
│  ├─ index.html      (v0.2)
│  └─ ballot-box.js
└─ worker/
   ├─ src/index.js
   └─ wrangler.toml
```

Two files are now called `index.html`. They do not collide — one is at the root,
one is inside `docs`.

---

## Step 3 — Keep v0.1 reachable, then switch Pages

GitHub Pages serves one folder at a time, and it can only be the repository root
or `/docs`. To keep the old version visible after switching, copy it first.

1. Open the root `index.html` in GitHub and click the pencil icon to edit.
2. Select all the text and copy it.
3. Go to `docs`, click **Add file → Create new file**, name it `v1.html`, paste,
   and commit.

Now switch the source:

4. Click **Settings**, then **Pages** in the left sidebar.
5. Under "Build and deployment", keep Source as `Deploy from a branch`.
6. Set branch to `main` and change the folder from `/ (root)` to `/docs`.
7. Click **Save** and wait two or three minutes.

Your two versions are then at:

```
https://akc-equity-lens.github.io/equity-lens/          (v0.2)
https://akc-equity-lens.github.io/equity-lens/v1.html   (v0.1)
```

A private repository can publish Pages on a paid GitHub plan, which you have.
Note that R5.1 asks for the tool to be inspectable — that applies at release,
not during the pilot, so private is fine for now.

---

## Step 4 — Deploy the ballot box to Cloudflare

This creates a **new, separate** Worker. Your existing `red-truth-67bd` is not
touched: `wrangler deploy` only affects the Worker named in `wrangler.toml`,
which is `equity-lens-ballots`.

First install Node.js (LTS) from [nodejs.org](https://nodejs.org) if you have
not already. Check it with `node --version` in Terminal or PowerShell.

Then:

1. Download the `worker` folder to your computer.
2. In Terminal, move into it:

   ```
   cd ~/Downloads/equity-lens/worker
   ```

   On Windows: `cd $HOME\Downloads\equity-lens\worker`

3. Log in:

   ```
   npx wrangler login
   ```

4. Confirm you are on the right account before deploying anything:

   ```
   npx wrangler whoami
   ```

   It should show the account behind Raganoglu@gmail.com. If it lists more than
   one account, add your account id to `wrangler.toml` as
   `account_id = "21bd2f30ccfa2dc744154c92c35ebb45"` — that value is visible in
   your dashboard URL.

5. Deploy:

   ```
   npx wrangler deploy
   ```

It prints an address like `https://equity-lens-ballots.your-name.workers.dev`.
Write it down.

Now check the separation held: open **Workers & Pages** in the dashboard. You
should see **two** Workers — `red-truth-67bd` unchanged, and
`equity-lens-ballots` newly created. If you only see one, stop and check which
folder you ran the command from.

### Do not enable Access on this Worker

The dashboard offers "Protect this Worker behind Access". Leave it off. Access
requires a Cloudflare login before any request reaches the Worker, which would
block committee members from voting. Security here comes from the seat tokens:
random, single-use, and never guessable.

---

## Step 5 — Introduce the two halves to each other

Two one-line edits. This is the step that most often goes wrong, so check each
character.

**Edit A.** In `docs/ballot-box.js`, near the top:

```js
const API = 'https://equity-lens-ballots.YOUR-SUBDOMAIN.workers.dev';
```

Replace with the address from step 4. You can edit this directly on GitHub with
the pencil icon.

**Edit B.** In `worker/src/index.js`, near the top:

```js
const ALLOWED_ORIGINS = [
  'https://akc-equity-lens.github.io',
  'http://localhost:8080',
];
```

For your account this is already correct — origin only, no repository name, no
trailing slash. If you later move the app to a custom domain, change it here and
redeploy.

After editing, run `npx wrangler deploy` once more.

---

## Step 6 — Test before showing anyone

You need two windows so two "people" can hold different seats. One normal window
and one private window works.

1. Open `https://akc-equity-lens.github.io/equity-lens/` in window one. This is
   the chair.
2. Set "How many members will vote" to **2**, click **Open session as chair**.
3. Copy the two seat links.
4. Add two candidates with different institutions and genders, so the bias
   checks have something to work with.
5. Click **Publish list and open voting**.
6. Paste seat link 1 into window two. The candidate list should appear.
7. Vote in window two.
8. In window one, click **Refresh**. It must say *Sealed. 1 of 2 ballots
   received*.
9. Open seat link 2 in a third window and vote.
10. Refresh window one. Results appear now.

If step 8 shows results instead of the sealed message, stop and tell me. That
would mean the seal is not working, and the seal is the whole privacy design.

---

## Checking it really is private

Worth doing once yourself, because the claim is only as good as the check.

1. In the Cloudflare dashboard, open **Workers & Pages → equity-lens-ballots**.
2. Find the Durable Object and open Data Studio.

You will see a `seats` table (hashed tokens, used yes or no), a `tally` table
(candidate id and a count), and a `roster` table holding unreadable text. There
is no column anywhere joining a seat to a ballot. That absence is the guarantee:
the question "who voted for whom" has no answer in this schema, not because of a
policy but because the data was never written.

The unreadable `roster` text is the encrypted candidate list. The key never left
the chair's browser.

---

## Costs

Nothing at committee scale. The Workers free plan includes Durable Objects with
SQLite storage, and free-plan accounts are not charged for that storage. A
session writes a handful of rows.

---

## Still missing after v0.2

- Configurable flags and weights (R1)
- Double-blind mode, confidence indicators, flag dismissal (R2.8, R5.4, R5.5)
- 30-day hashing of candidate names, differential privacy (R3.2, R3.5)
- CSV upload (R4.2)
- Longitudinal committee feedback and benchmarks (R7)
