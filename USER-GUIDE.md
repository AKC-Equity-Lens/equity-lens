# Equity Lens — user guide

For chairs and committee members. No technical background assumed.

The tool is at **[akc-equity-lens.github.io/equity-lens](https://akc-equity-lens.github.io/equity-lens/)**.
Nothing to install, no account to create.

---

## Contents

- [Who does what](#who-does-what)
- [Before you start](#before-you-start)
- [For the chair, step by step](#for-the-chair-step-by-step)
- [For committee members](#for-committee-members)
- [What each flag means](#what-each-flag-means)
- [Double-blind mode](#double-blind-mode)
- [What the tool stores](#what-the-tool-stores)
- [When something goes wrong](#when-something-goes-wrong)
- [Glossary](#glossary)

---

## Who does what

**The chair** opens the session, types in the candidates, reviews the bias
check, hands out seats, and reads the results at the end. The chair sees
everything.

**Committee members** receive one seat each, see the candidate list and the same
bias check on their own phone or laptop, and cast one ballot. They never see who
else voted for whom — and neither does the chair.

One person can be both: a chair who also votes simply takes one of the seats.

---

## Before you start

Three decisions, and it is worth making them before you open the session rather
than in front of the committee.

**Which kind of selection is this?** Speaker invitation, award or prize, junior
hire, or senior hire and professorship. The choice changes which fields you are
asked for and which optional checks run. A speaker invitation asks about prior
invitations; a hire asks about teaching, supervision, funding and mobility.

**How many members will vote?** Results stay sealed until exactly this many
ballots are in, so count carefully. If you say five and only four people vote,
the results never unlock.

**Double-blind or not?** You must decide before publishing the list — it cannot
be switched on afterwards. See [below](#double-blind-mode).

You will also need an **h-index for every candidate from the same source**.
Scopus, Web of Science and Google Scholar give different numbers for the same
person, so mixing them produces a meaningless comparison.

---

## For the chair, step by step

### 1. Open the session

On the start screen choose the selection type and the number of voting members,
then press **Open session as chair**.

If you do not want this session offered for the open dataset later, tick the
opt-out box now. It removes the option entirely so it cannot be pressed by
accident.

### 2. Hand out the seats

You will see one card per seat, each with a QR code, the link beneath it, and a
button to copy that link.

- **Remotely:** copy each link and send it privately, one per person. "Copy all
  links" gives you the whole list at once.
- **In the room:** press **Present codes full screen** and show one code at a
  time while each person scans it with their phone camera. Arrow keys or the
  buttons move between seats.

> **Show one code at a time.** Anyone who can photograph a code can cast that
> seat's ballot. Projecting all of them at once lets somebody take a seat that
> was not meant for them.

Each seat works once. There is no way to re-issue one, so if a link is lost
before voting, the simplest fix is to start a new session.

### 3. Enter the candidates

Fill in the form and press **Add candidate** for each one. Required fields are
marked with a red star.

The **h-index lookup** button opens Scopus' free author search and copies the
name to your clipboard, so you can paste it straight into the search box.

The **career interruption** checkbox records only *that* there was one — never
the reason. This is deliberate: it means the tool holds no health data about
anyone.

### 4. Read the bias check

Checks run on their own as the pool grows; there is no button to press. Flags
appear under *Patterns worth a second look*, and the candidate detail table
below shows every value you entered.

On a phone, the table becomes one card per candidate, so nothing is hidden off
the side of the screen.

A flag is a prompt to look again, not a verdict. The tool does not rank
candidates and does not recommend an outcome.

### 5. Publish the list

Press **Publish list and open voting**. The candidate list is encrypted in your
own browser before it is sent, and the key travels to members inside their seat
link — the part after the `#`, which browsers never transmit to a server.

The list locks on publishing. If you spot a mistake, **Reopen the list to edit**
works only until the first ballot is cast; after that the pool is fixed.

### 6. Let the committee vote, then read the results

Press **Refresh** in the Ballot box section to see progress. While voting is
open you will see *Sealed — 3 of 5 ballots received*, and nothing more.

This is not a formality. If you could watch the totals rise between two ballots,
you could work out how an individual voted by subtraction. The seal is what
prevents that.

Once the last seat has voted, the totals appear. They show counts per candidate
and nothing else.

### 7. Afterwards

- **Export anonymised session** downloads a record for your own files.
- **Contribute to the open dataset** is entirely optional, shows you the exact
  record before anything is sent, and contains only coarse buckets — no names,
  no institutions, no exact counts, no link back to the session.
- **Delete all session data** erases everything on the server immediately.

Automatic deletion when voting ends is not yet implemented, so for now this is a
manual step. Do it when the committee is finished.

---

## For committee members

Your chair gives you one seat, either as a private link or as a QR code to scan
from the screen.

1. Open your link, or scan the code with your phone camera.
2. You will see the candidates and the same bias check the chair sees.
3. Press the button for the candidate you are voting for.

That is all. Your ballot is counted but never recorded against your name — the
pairing is not stored anywhere, so nobody can reconstruct it later, including the
chair and including whoever runs the server.

Your link works **once**. Do not forward it: whoever opens it can cast your
ballot.

---

## What each flag means

| Flag | When it appears | What it is telling you |
|---|---|---|
| **Gender balance** | The pool is noticeably skewed | Whether the shortlist reflects the field it was drawn from, or narrowed somewhere earlier |
| **Institutional concentration** | A large share come from one institution | Possibly a strong department; possibly a network effect in who got nominated |
| **Career interruptions** | One or more candidates have an interruption of six months or more | Raw output in a given period under-counts someone who was absent for part of it |
| **Impact beyond citations** | Candidates have patents, policy citations, media coverage or prizes | None of this appears in an h-index. Weigh it alongside the metrics, not after them |
| **Familiarity** ‡ | A candidate has two or more prior invitations or awards | Repeated visibility can look like merit because it already looked like merit |
| **Career-stage productivity** ‡ | The m-quotient diverges from the h-index ranking | An early-career candidate with a high rate may out-produce a senior one with a larger total |

‡ Optional — switched on or off by selection type. The four above them always
run and cannot be disabled. Anything you do switch off is recorded with the
session, so the record shows which checks were active rather than quietly
omitting them.

---

## Double-blind mode

Ticking **hide names and gender from members** before publishing means committee
members see "Candidate 1", "Candidate 2" and so on, in a shuffled order. Gender
is withheld, and so are key publications — a title identifies its author.

Institution, career stage and metrics stay visible, because the committee still
has to judge something.

Two things to understand before relying on it:

**You are never blind.** You typed the names in. The mode reduces bias among
the other members, not your own.

**It is not anonymity.** In a small field, a career stage plus an institution
plus an h-index can identify a person perfectly well. It reduces bias; it does
not guarantee anonymity.

---

## What the tool stores

Short version, in the order that matters:

**The link between a member and their ballot is never written down.** Hashed
seat tokens and per-candidate counts sit in two tables with no column joining
them. The question "who voted for whom" has no answer in the data — that is a
property of how it is built, not a promise about how it is used.

**The candidate list is encrypted before it leaves your browser**, with
AES-256-GCM. The server holds text it has no key for.

**Nothing is tracked.** No cookies, no analytics, no advertising, no third-party
scripts, no accounts. Candidate data is never used to train anything.

**You are the data controller.** The committee running the selection is
responsible for informing candidates that their data is being processed, for its
legal basis, and for retention. The tool carries a full privacy notice in its own
interface.

---

## When something goes wrong

**A member's link does not work.** Each link works once. If it has already been
used, that seat has voted. If it was never used, check it was copied in full —
the part after the `#` is essential, and some chat applications truncate long
links. Sending the QR code instead avoids this.

**The results will not unlock.** Results need *every* seat to vote. If you set
five seats and only four people are present, the totals stay sealed. Set the
number to match the people who will actually vote.

**I cannot edit the candidate list.** It locks on publishing. Before the first
ballot, "Reopen the list to edit" releases it. After that it is fixed, which is
deliberate — changing the pool mid-vote would invalidate the ballots already
cast.

**Someone sees an old version of the page.** Every page shows a build stamp at
the very bottom, like `build 2026-09-19-e`. If two people see different stamps,
the one with the older stamp should reload with Ctrl+Shift+R (Cmd+Shift+R on a
Mac).

**On a phone I cannot find a section.** Once a session is running, a bar appears
fixed at the bottom with buttons for Candidates, Bias check, Vote and so on. Tap
one to jump straight there.

**The candidate table looks different on my phone.** It is not a table on a small
screen — each candidate becomes a card with one labelled row per field, so
nothing sits off the edge. Every value shown on a computer is shown on a phone.

**The tool says it cannot reach the voting server.** The bias check still works,
but voting will not. This usually means a connection problem at your end; try
again, and if it persists, open an issue.

---

## Glossary

**h-index** — a researcher has an h-index of 20 if 20 of their papers have at
least 20 citations each. It rewards sustained output and grows with career
length, which is why comparing a postdoc to a professor on h-index alone is
misleading.

**m-quotient** — the h-index divided by years since first publication. A rate
rather than a total, so it compares across career stages more fairly. A
candidate six years in with an h-index of 20 has an m-quotient of 3.3.

**Seat** — one person's right to vote in a session, represented by a single-use
link or QR code.

**Sealed** — results exist but are not shown, because not every seat has voted
yet.

**Quorum** — here, simply all seats. Results unlock only when every seat has
cast its ballot.

**Double-blind** — candidate names and gender hidden from committee members. The
chair is never blind.

---

*Questions, problems, or disagreement with how a flag works:
[open an issue](https://github.com/AKC-Equity-Lens/equity-lens/issues).
Criticism of the indicators is especially welcome — see
[CONTRIBUTING.md](CONTRIBUTING.md).*
