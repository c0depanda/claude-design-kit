# Contributing

Improvements should make the workflow easier to follow or make the tools more reliable across projects.

## Where changes belong

- Explain workflow changes and their reasons in `WORKFLOW.md`; add a pitfall when a real failure taught the rule.
- Keep the README and getting-started guide focused on the first successful run.
- Keep prompt templates aligned with the workflow and document tool changes in `tools/README.md` and `tools/env.example`.
- Use Halcyon and fictional data in examples. Keep real exports, company details, credentials, browser storage states, and local paths out of contributions.
- Preserve stable frame IDs and keep generated example packs reproducible from the example change script.

## Check a change

Start with the [local sample](README.md#try-it-locally), then run the [worked example](tools/linking/examples/halcyon/README.md) from a fresh temporary directory. Build its pack, rehearse twice, check the installed export, and inspect the render comparison when you change anything affecting appearance.

For JavaScript changes, run `node --check path/to/changed-file.mjs` (or `.js`). For the Python tools, run `python3 -m py_compile tools/design.py tools/install-export.py`. Validate edited JSON and try changed commands as written, including from paths containing spaces where relevant.

When changing export installation, exercise it against disposable folders and ZIPs: check-only must leave the installed design alone, installation must preserve the previous export as a backup, and a mismatched expectation must block installation. For contract changes, use a local fixture or disposable review app and inspect the report; a successful process exit alone does not mean frames match.

There is currently no comprehensive automated test suite or live Claude Design integration test. The worked example is the reproducible local verification path; state exactly what you checked and what still needs a live project.

## Propose a change

Open an issue or pull request with the problem, the resulting behaviour, and how you verified it. Include a minimal fictional fixture for tool bugs. Do not attach real design exports or account state.
