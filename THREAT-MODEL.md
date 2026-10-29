# Equity Lens — threat model

*Version 1.0, 29 October 2026. Describes the code as deployed at build `2026-10-29-b`. Every claim below can be checked against `worker/src/index.js` and `docs/ballot-box.js`; where the code and this document disagree, the code is right and this document has a bug — please open an issue.*

This is not a security certificate. It is a list of who might try to learn something they should not, what the design lets them learn, and what it does not solve. The residual risks are the most important section.

---

## 1. What the system is protecting

Two things, in order of importance:

1. **The pairing of a committee member and their ballot.** Nobody — not the chair, not the server operator, not another member — should be able to learn how an individual voted.
2. **The candidate list.** Names, institutions, gender, career data and metrics entered by the chair should be readable only by the committee, never by the server or whoever operates it.

Out of scope, by design: the *outcome* is not secret (the chair reads the totals and may publish them), and the *existence* of a session is not secret.

## 2. What is stored where

| Where | What | Readable by |
|---|---|---|
| **Chair's browser** (sessionStorage, cleared when the tab closes) | candidate list in clear, chair token, room key, seat links | the chair |
| **Member's browser** (sessionStorage) | seat token, room key | that member |
| **Ballot server** — `seats` table | SHA-256 hash of each seat token, and a `used` flag | operator |
| **Ballot server** — `tally` table | opaque candidate id, count | operator (and the chair, once unsealed) |
| **Ballot server** — `roster` table | the candidate list, encrypted with AES-256-GCM in the chair's browser | nobody on the server: no key is ever sent to it |
| **Ballot server** — `meta` table | quorum, hash of the chair token, opening time | operator |
| **Seat link** | session id, seat token, room key — all in the URL fragment (`#…`) | whoever holds the link |
| **Open dataset** (optional, opt-in by the chair) | eleven coarse buckets per session, whitelisted server-side | everyone — it is public by design |

The two tables that matter, `seats` and `tally`, have **no column that refers to the other**. A ballot is one transaction: mark a seat used, increment a candidate's count. The question "which seat produced which increment" is not answered anywhere in the data.

## 3. Adversaries

### 3.1 The server operator (whoever runs the Worker — today, the author; tomorrow, your institution)

**Can learn:** that a session exists, when it opened, how many seats it has, how many have voted, and — once every seat has voted — the totals per opaque candidate id. Can delete sessions. Can see network metadata of each request (IP address, time) in the hosting provider's logs, as with any web service.

**Cannot learn:** candidate names or anything else in the list (ciphertext, no key); which seat voted for which candidate (no join); the totals while the vote is sealed (the code refuses to return them until `cast == quorum`).

**Could, by changing the code:** log the body of each ballot request as it arrives, pairing seat hash and candidate id in a log file. The published code does not do this. This is the reason the server code is open and the reason an institution should run its own instance rather than trust the author's. It is also why the Second Stage plan includes a reproducible build: so that what runs can be checked against what is published.

### 3.2 The chair

**Can learn:** everything about the candidates (she typed them in), the totals once unsealed, how many members have voted at any time.

**Cannot learn:** which member voted for which candidate — the chair's token gives access to the tally, which has no seat information, and to the seat hashes, which have no candidate information. The chair also cannot read the tally while sealed, for the reason in 3.5.

**Can misuse:** the seat links. The chair generates them and could keep one and vote with it, or give two to one person. The tool cannot prevent this; it is the same trust placed in whoever hands out paper ballots. The record it does keep is the quorum: a session opened for five seats accepts exactly five ballots.

### 3.3 A colluding group of members

**Can learn:** their own ballots, and the totals. By subtraction, if all but one member collude, they learn the last member's ballot. This is true of every secret ballot, paper included, and is listed under residual risks.

**Cannot learn:** anything from the server beyond what any member sees — a seat token grants one ballot and read access to the encrypted list, nothing more.

### 3.4 An outsider — on the network, or someone who photographs a projected QR code

**On the network:** sees TLS. The static page is served over HTTPS; the Worker accepts only HTTPS, and browsers may call it only from the deployed origin (CORS). Non-browser clients can reach the API, which is fine: every action that changes anything requires a seat or chair token. The seat token and the room key never leave the browser in any request: they live in the URL fragment, which browsers do not transmit, and are stripped from the address bar on arrival.

**With a photographed QR code or a forwarded link:** holds one seat and the room key — can read the candidate list and cast *that* seat's ballot, once. This is why the interface shows one code at a time and the guide says not to project all of them. A seat link is a credential; treat it like one.

**Guessing:** session ids are 64 random bits, seat and chair tokens 128 random bits, generated by the platform's CSPRNG. Brute force is not a practical concern. A wrong seat token is rejected before any state changes.

### 3.5 Anyone watching the totals

A running total watched between two ballots reveals an individual's vote by subtraction. The server therefore returns the tally only when `cast == quorum`; before that, the chair sees "sealed, 3 of 5". There is no endpoint that returns partial results.

## 4. Residual risks — what this design does not solve

Stated so that a committee can decide whether the tool fits its situation.

1. **Small committees have small anonymity sets.** Three members: if two compare notes, they know the third ballot. A unanimous result reveals every ballot by definition. The tool does not pretend otherwise; the chair sees the quorum before opening and should not use it for a committee of two or three.
2. **The chair is never blind.** Double-blind mode hides names from *members*. The chair entered them. The mode reduces bias among the members; it does nothing for the chair's own.
3. **The operator could alter the running code.** Addressed by openness, self-hosting and a planned reproducible build — not by cryptography. If you cannot audit or self-host, you are trusting the operator, and the tool says so in its privacy notice.
4. **Hosting-provider metadata.** The provider sees request times and IP addresses. It does not see ballots. An operator who correlated "ballot request at 14:02:31 from IP X" with the moment a count changed could, in principle, link a vote to a network address if they also stored the count after each request. The published code stores no timestamps on ballots and no per-request counts; this is a code-review item, not a cryptographic guarantee.
5. **Deletion is manual.** The encrypted list and the seat hashes stay on the server until the chair presses *Delete all session data*. Automatic deletion at quorum is planned (specification R3.2) and not yet implemented.
6. **The open dataset is public by construction.** Each record is eleven coarse buckets (pool size as a range, women's share rounded to ten percent, discipline, quarter, selection type, …) with no session reference and no free text; the server rejects anything else. Aggregated statistics are withheld below five records. The raw records are nevertheless public, and in a very small field a bucket combination (one optics prize in a given quarter) may be recognisable. The chair sees the exact record before it is sent and can opt out of the dataset when opening the session.
7. **The browser is trusted.** A compromised browser, a malicious extension, or malware on the chair's machine sees everything the chair sees. No web application can defend against this and this one does not claim to.
8. **No voter-side verifiability of the count.** A member can see that their seat was accepted (the server returns `recorded`), but cannot afterwards prove that their ballot entered the total — doing so without reintroducing a voter–ballot link requires end-to-end verifiable voting (Helios, Belenios), which is deliberately out of scope for a committee tool. The compensating control is that the tally code is open and short, and that the seat count equals the sum of the tally.

## 5. Things found by writing this document

- **Seat tokens were in the query string** (`?session=…&seat=…`) until build `2026-10-29-a`. A static host that logs query strings therefore held a credential that could spoil a seat. Session id and seat token now travel in the fragment with the key; old links are still accepted so a running session is not broken.
- The `erase` endpoint accepted a request without a chair token for a session that had never been opened. Harmless (there is nothing to erase) but untidy; noted for cleanup.

## 6. Reporting

Security findings: see `SECURITY.md`. Findings and their fixes are published in the changelog once resolved. Criticism of this document is explicitly welcome — a threat model that nobody argues with is a threat model nobody read.
