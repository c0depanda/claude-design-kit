# Worked example: a small pack for the invented product Halcyon

Halcyon, its people and its amounts are invented. The example is small enough to read whole, and it runs end to end on your machine.

| Path | What it is |
|---|---|
| `design/` | The design project as Claude Design has it before the pack: one design file (`P1 Payments.dc.html`, three screen frames and one email frame), the library (`components/hx-tokens.css`, `components/hx.css`) and `CLAUDE.md`. A real export also carries Claude Design's own runtime files. |
| `change.mjs` | The change, as a script: mark the badges and give the chosen speed its checked state. |
| `rules.md` | The section of standing rules to append to `CLAUDE.md`. |
| `pack/` | What the owner attaches in Claude Design: the toolkit, the two scripts and their data. `fingerprints.json` stays with you as the record. |
| `PROMPT.md` | The prompt the owner gives Claude Design with the pack. |

## How the pack was built

Set `KIT` to your clone's absolute path. These commands work from any folder and put generated files in a fresh temporary directory, leaving the bundled example unchanged. Python 3.9+ and Node.js 20+ are required; only the final render comparison needs Playwright.

```sh
export EXAMPLE="$KIT/tools/linking/examples/halcyon"
export DEMO="$(mktemp -d "${TMPDIR:-/tmp}/claude-design-demo.XXXXXX")"
cp -R "$EXAMPLE/design" "$DEMO/after"
node "$EXAMPLE/change.mjs" "$DEMO/after"
node "$KIT/tools/linking/build-pack.mjs" "$EXAMPLE/design" "$DEMO/after" "$DEMO/pack"
node "$KIT/tools/linking/build-rules-pack.mjs" "$EXAMPLE/design/CLAUDE.md" "$EXAMPLE/rules.md" "$DEMO/pack"
```

`build-pack.mjs` reports `P1: 5 parts in 3 patterns, 0 fixes · same elements, attribute order differs on 4 tags`: the script wrote the marks before `style`, the toolkit writes them after, and the result is the same elements with the same attributes.

## Rehearse it

Run the pack on a copy, exactly as Claude Design will, twice:

```sh
cp -R "$EXAMPLE/design" "$DEMO/run"
node "$KIT/tools/linking/run-pack-local.mjs" "$DEMO/run" "$DEMO/pack"
node "$KIT/tools/linking/run-pack-local.mjs" "$DEMO/run" "$DEMO/pack"
```

The first run should report `matchedExport: true`, `saved: 1`, and `verified: 1`. The second should report the rules as `already: true` and the design under `already: ["P1"]`, with `saved: 0`. On both runs, check that `failed` and `wrong` are empty.

Then prove nothing else changed (needs Playwright; see [the tools reference](../../../README.md)):

```sh
node "$KIT/tools/linking/compare-render.mjs" "$EXAMPLE/design" "$DEMO/run" "$DEMO/render.json"
```

It reports one changed pattern: the two chosen radios now draw the checked ring (border and fill), with nothing moved or resized. The badge marks change nothing on screen. Inspect `render.json` as well as the summary; the report records differences for review rather than failing on every difference.

## Try installing the result

Use a disposable destination to practise checking, installation, and backups:

```sh
cp -R "$EXAMPLE/design" "$DEMO/installed"
DESIGN_DIR="$DEMO/installed" DESIGN_BACKUPS="$DEMO/backups" \
  python3 "$KIT/tools/install-export.py" "$DEMO/run" --name demo --expect "$DEMO/pack/fingerprints.json"
DESIGN_DIR="$DEMO/installed" DESIGN_BACKUPS="$DEMO/backups" \
  python3 "$KIT/tools/install-export.py" "$DEMO/run" --name demo --expect "$DEMO/pack/fingerprints.json" --install
DESIGN_DIR="$DEMO/installed" python3 "$KIT/tools/design.py" check all
node "$KIT/tools/linking/index.mjs" "$DEMO/installed" "$DEMO/index"
```

Expect no fingerprint mismatches, four frames, and zero link/ID problems. The original design is preserved at `$DEMO/backups/Design-before-demo`. The rehearsal includes temporary upload files; a real installation should use the export downloaded from Claude Design.

For a live project, attach the generated pack's `.js` and `.json` files except `fingerprints.json`, and use [PROMPT.md](PROMPT.md) as the prompt. Keep the fingerprints locally to check the returned export. The local rehearsal verifies the pack logic; it does not connect to or test a live Claude Design project. Outputs remain under `$DEMO` for inspection.
