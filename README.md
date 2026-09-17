# Equity Lens

**Equitable decision support for selection committees.**

Equity Lens makes structural patterns in a candidate pool visible to a selection
committee before it decides — gender balance, institutional concentration,
career interruptions, impact that citation metrics miss. It does not rank
candidates, does not recommend an outcome, and never records who voted for whom.

A speedometer, not a speed limit.

**[Try the live demo →](https://akc-equity-lens.github.io/equity-lens/)**

An initiative of the [Working Group on Equal Opportunities
(AKC)](https://www.dpg-physik.de/vereinigungen/fachuebergreifend/ak/akc) of the
German Physical Society (DPG), developed through a multi-stakeholder co-creation
workshop held as an official side event of the first UN Global Dialogue on AI
Governance (Geneva, July 2026).

---

## Status

**Prototype.** Working and usable, but not yet piloted, independently evaluated,
or validated against historical selection data. Indicators and thresholds are
design proposals, not established measures. Treat its output as a prompt to look
again, never as a finding.

We are actively looking for committees willing to pilot it and for people willing
to challenge the indicators. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## What it does

- **Four checks always run**, for every kind of selection, and cannot be switched
  off: gender balance, institutional concentration, career interruptions, and
  impact beyond citations.
- **Two more are set by selection type** — familiarity / repeated invitations, and
  career-stage productivity — with defaults per profile and a record of anything
  a committee switches off.
- **Four selection profiles**: speaker invitation, award or prize, junior hire,
  senior hire or professorship. Each collects different criteria.
- **Optional double-blind mode** hides candidate names, gender and key
  publications from committee members. The chair is never blind.
- **Private voting** from each member's own device, by single-use seat link or QR
  code. Results stay sealed until every seat has voted.

## What it will never do

- Rank candidates or produce a score
- Recommend an outcome
- Store which member cast which ballot
- Make the decision

---

## How a session runs

1. The chair opens a session, picks the selection type and the number of voters.
2. The chair enters candidates. Checks run automatically as the pool grows.
3. The chair publishes the list — encrypted in their own browser first — and
   hands each member a single-use seat link or QR code.
4. Members open their link on their own device, see the candidates and the same
   bias check, and cast one ballot each.
5. Results unlock only once every seat has voted, and show totals alone.

Full instructions are in the user manual; a one-page workflow summary is also
available from AKC.

---

## Privacy by design

The tool is built so that the sensitive questions have no answer to give, rather
than a policy promising not to answer them.

- **The voter–ballot link is never written.** Hashed seat tokens and per-candidate
  counts live in two tables with no column joining them. Nobody — not the chair,
  not AKC, not whoever operates the server — can reconstruct how a member voted.
- **The candidate list is encrypted in the chair's browser** with AES-256-GCM
  before it is transmitted. The key travels to members inside the fragment of
  their seat link, which browsers never send to a server. The server holds
  ciphertext it has no key for.
- **Results stay sealed until quorum**, because a running total watched between
  two ballots reveals an individual vote by subtraction.
- **Erasure on demand.** The chair can delete a session's data at any time.
- **No cookies, no analytics, no trackers, no third-party scripts, no accounts.**

This is privacy *by design*, not a claim of compliance: GDPR compliance depends
on the committee running the selection — their legal basis, their notice to
candidates, their retention policy. They are the controller of that data, not
AKC. The tool carries a privacy notice in its own interface stating exactly what
is held and where.

---

## Limitations

Stated in the interface itself, and repeated here because they matter:

- It does not detect bias it has not been told to look for, including racial,
  disability and socioeconomic bias.
- It cannot verify what is typed in. A wrong h-index produces a confident wrong
  flag.
- Gender is recorded as the chair enters it, not as the candidate self-identifies.
- Double-blind mode reduces identifiability; in a small field a career stage and
  an h-index may still identify someone.
- It has no memory across sessions yet, so it cannot show a committee its own
  pattern over time.

---

## Repository layout

```
docs/          the committee-facing app, served by GitHub Pages
  index.html     the whole interface and the bias engine
  ballot-box.js  the client side of the ballot API
  qr.js          a self-contained QR encoder (no external dependency)
worker/        the ballot box, deployed to Cloudflare Workers
  src/index.js   the API and its storage
  wrangler.toml  deployment configuration
```

The app is deliberately dependency-free: no build step, no package manager, no
third-party scripts, fonts or trackers at runtime. Everything it runs is in this
repository, which is what allows the privacy notice above to be true.

## Running it yourself

Any institution can host its own instance. The app is static files; the ballot
box is a small Cloudflare Worker. Deployment notes are in `SETUP.md`.

If you self-host, **your organisation is the data controller** for the candidate
data your committees enter, and is responsible for informing candidates and for
its own legal basis.

---

## Contributing

Feedback, criticism of the indicators, and pilot reports are more valuable to us
right now than code. See [CONTRIBUTING.md](CONTRIBUTING.md) — it lists the
questions we most need help with and the design constraints any change has to
respect.

## Citing

If Equity Lens informs your work, please cite it. See `CITATION.cff`, or use the
"Cite this repository" button on GitHub.

## Licence

Licensed under the [MIT Licence](LICENSE). You may use, modify, distribute and
sell this software, including commercially, provided the copyright notice and
licence text travel with every copy.

### Name and marks

The licence covers the code. It does **not** grant rights to the name "Equity
Lens", the Equity Lens magnifier mark, or the AKC and DPG marks. You are free to
fork and modify, but a derivative work must carry a different name and must not
imply endorsement by AKC or DPG.

### Documents and data

The documentation, the requirement specification and any published benchmark
dataset are licensed separately under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — free to reuse with
attribution.

## Contact

akc@dpg-physik.de · or open a GitHub Issue.

© 2026 Ruzin Aganoglu and the Working Group on Equal Opportunities (AKC) of the German Physical Society (DPG)
