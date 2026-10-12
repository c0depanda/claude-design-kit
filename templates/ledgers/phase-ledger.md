<!--
Template: the ledger for one implementation phase. It names the briefs the phase builds and records each item's status
with its commit, so anyone can see what is done and what waits. Keep decisions and evidence here, not in code comments.
Status: ☐ to do · ◐ in progress · ☑ done (commit) · ⏸ waiting on an owner decision or the backend.
Delete this comment.
-->

# <Phase name> · ledger · <d Month yyyy>

Builds the designs from these briefs and closeouts:
- `HANDOFF-<topic>-<date>.md`: <one line on what it covers>
- `HANDOFF-<topic>-closeout-<date>.md`: <…>

The app's rules apply throughout. Where data only the backend holds is missing, the designed element is built and a backend ask is logged; against the real backend the element shows its unavailable state.

## Part 1 · <scope, e.g. frontend only, no new data>

- ☑ **Item 4 · <title>** (`<commit>`): <what changed, by file and frame id>
- ◐ **Item 6 · <title>**: <what is in progress>
- ⏸ **Item 9 · <title>**, waiting for <the owner | backend ask BA-3>: <what is built, what waits>

## Backend asks raised

- <ask number or title>: <screen> · <missing field or endpoint>

## Design questions raised

- <number and title, with frame ids>
