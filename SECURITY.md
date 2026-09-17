# Security Policy

EquityLens handles ballots and candidate data. A defect here can expose how
someone voted or who was considered, so please report problems privately rather
than in a public issue.

## Reporting

Email **akc@dpg-physik.de** with "EquityLens security" in the subject. Include
what you found, how to reproduce it, and what you think the impact is. We will
acknowledge your report and keep you informed of what we do about it.

Please do not open a public GitHub issue for a vulnerability until it has been
addressed.

## What we consider serious

In rough order of severity:

1. **Anything that links a committee member to their ballot.** This is the
   property the whole design rests on.
2. **Anything that reveals a running tally before every seat has voted**, since a
   tally observed between two ballots discloses an individual vote by subtraction.
3. **Anything that exposes candidate data in readable form** outside the chair's
   browser, including defeating the encryption of the published candidate list.
4. **Anything that lets one person cast more than one ballot**, or cast a ballot
   for a seat they were not given.
5. **Anything that would put personal data into the anonymous archive.**

Reports about the tool's *judgments* — a threshold you think is wrong, an
indicator you think is unfair — are not security issues, and are very welcome as
public issues. See CONTRIBUTING.md.

## Scope

This policy covers the code in this repository. If you are running your own
instance, your deployment — your Cloudflare account, your hosting, your access
control — is yours to secure.

## Recognition

We will credit reporters in the release notes unless you prefer otherwise.
