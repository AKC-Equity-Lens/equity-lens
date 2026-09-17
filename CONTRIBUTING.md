# Contributing to Equity Lens

Thank you for looking. This project needs disagreement more than it needs code.

Equity Lens makes claims about what counts as a pattern worth noticing in a
selection process. Those claims should be contested by people who run committees,
who study bias, and who have been on the receiving end of selection decisions —
not settled by whoever happens to be writing the software.

---

## What would help most

**1. Challenge an indicator.** Is "40% from one institution" the right threshold
in your field, or meaningless? Is two prior invitations in three years a signal or
noise? Does the m-quotient behave sensibly for your discipline's publication
culture? Open an issue titled `Indicator: <name>` and say what you would change
and why.

**2. Tell us what is missing.** The tool currently sees gender, institution,
career stage, career interruption and citation metrics. It is blind to racial,
disability and socioeconomic bias, and to network effects it cannot observe.
If you know how such a pattern could be surfaced without creating a new harm, we
want to hear it.

**3. Pilot it and report back.** Run one real selection and tell us where it got
in the way, what the committee ignored, and what it got wrong. A critical pilot
report is the single most useful contribution possible right now.

**4. Field-specific defaults.** Different disciplines evaluate differently. If you
can describe what a fair default looks like for yours, that becomes a selection
profile.

**5. Code.** Bug fixes, accessibility improvements and mobile issues are always
welcome. Please open an issue first for anything larger, so we can check it fits
the constraints below.

---

## Design constraints

These are not style preferences. They are the reasons the tool is safe to put in
a committee room, and a change that breaks one will not be merged.

- **No ranking, scoring or recommendation.** The tool never orders candidates and
  never produces a number that could be read as "who should win". If a feature
  would let a committee sort candidates by quality, it does not belong here.
- **The voter–ballot pairing is never stored.** Not encrypted, not hashed — never
  written. Any change that would make it derivable, including showing a running
  tally before quorum, is out.
- **No third-party scripts, fonts, analytics or trackers.** The privacy notice
  states this, so it must remain literally true. If a library is needed, it gets
  vendored into the repository and reviewed.
- **Core checks cannot be made optional.** Gender balance, institutional
  concentration, career interruptions and impact beyond citations always run. A
  check a committee can disable on an inconvenient day is not a check.
- **Candidate data is minimised.** No field is collected that no check uses, and
  no reason is recorded where the bare fact suffices — the career interruption
  field deliberately records *that* there was one, never why, which keeps health
  data out of the system entirely.
- **Limitations stay visible in the interface**, not in a footnote.

---

## Running it locally

The app is two halves. The interface is static files; the ballot box is a
Cloudflare Worker.

```bash
# the interface — it must be served, not opened from disk,
# because it loads ES modules
cd docs && python3 -m http.server 8080
# then open http://localhost:8080
```

The interface will report that it cannot reach the voting server until a Worker
is running. Deploying your own is described in `SETUP.md`; you will need a free
Cloudflare account.

```bash
cd worker && npx wrangler deploy
```

Then set `API` at the top of `docs/ballot-box.js` to your Worker's address, and
add your origin to `ALLOWED_ORIGINS` in `worker/src/index.js`.

There is no build step, no bundler and no package to install for the interface —
that is deliberate, so that anyone reviewing the code is reading exactly what
runs.

## Code style

Plain, modern JavaScript. Comments explain *why* a thing is done, particularly
where the reason is a privacy or fairness property rather than a technical one.
Keep them; they are the documentation that matters most here.

## Reporting a security issue

Please do not open a public issue for a vulnerability, especially one affecting
ballot secrecy. See `SECURITY.md`.

## Conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Licensing of contributions

Contributions are accepted under the MIT Licence, the licence of this project.
By opening a pull request you confirm you have the right to submit the work under
that licence.

## Contact

akc@dpg-physik.de
