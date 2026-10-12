<!--
Template: the coverage ledger for an implementation phase. One file per person or worker (coverage-<name>.md), merged
by the lead. One row per frame family. Never relabel or delete a row; correct it with a new row.
UI status is exactly one of: static scan · visually reviewed · journey exercised · fixed and rechecked · blocked · excluded.
  - "Visually reviewed" means you rendered the frame (shoot.mjs) and the app at the same width and looked at both.
    A route loading or a scenario applying is not acceptance.
  - "Blocked" only when even the UI can't be finished without an unresolved contract; say what is built and what waits.
  - "Not walked for time" is never a status.
Live integration is one of: backend supports today · blocked: <backend ask number> · n/a.
Evidence: screenshots named by frame id, contract-check report paths, walk logs. Screenshots are evidence, not tests.
Delete this comment.
-->

# Coverage · <phase> · <name>

| Design file · frame family | Route | Account · context · role | Scenario · overlay | Canonical component | Widths · themes · engines | UI status | Live integration | Finding / fix | Evidence | Remaining dependency |
|---|---|---|---|---|---|---|---|---|---|---|
| S2 · hx-s2-1 profile (1440, 1024, 390, 320) | /settings/profile | member | default | SettingsProfile, HxDescriptionList | 1440 1024 390 320 · light dark · Chromium, WebKit 1440/390 | fixed and rechecked (<commit>) | backend supports today | Example: panel headings were 15px where the frames draw 16/24; fixed in HxDescriptionList, its other users rechecked | contract/reports/<time>/report.md; shots/hx-s2-1-profile-390.png | — |

## Summary

| Design file | Rows | Static scan | Visually reviewed | Journey exercised | Fixed and rechecked | Blocked | Excluded |
|---|---|---|---|---|---|---|---|
| <file> | | | | | | | |
