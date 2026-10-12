# Tools

Scripts for reading Claude Design exports, checking an app against them, and changing designs in bulk through fingerprinted script packs. `../WORKFLOW.md` says when to use each one; this file says how. Examples use Halcyon, an invented product with the component prefix `hx`.

The input requirements are the same for standalone projects and Design artifacts: `*.dc.html` source files, frames marked with `id` and `data-screen-label`, component marks, and resolved styles and assets. Inspect the first export before using these tools. Remote pack execution also requires the file and script tools listed in [WORKFLOW section 1](../WORKFLOW.md#1-the-loop-and-who-does-what); fresh Artifacts exports and remote execution have not yet been tested.

## Requirements and settings

- **Python 3.9 or later** for `design.py` and `install-export.py`. No packages.
- **Node 20 or later** for the `.mjs` tools.
- **Playwright with Chromium** for `shoot.mjs`, `compare-render.mjs` and the contract checker. Point `PLAYWRIGHT_MODULE` at a project's `node_modules/playwright/index.js`, or run `npm ci` and `npx playwright install chromium` in this folder once.
- **Settings** are environment variables, listed with examples in `env.example`. Copy it to `env.local` (git ignores it), fill in the paths, enable optional settings only when needed, and load it with `set -a; source <kit>/tools/env.local; set +a`. For a first run, follow [getting started](../docs/getting-started.md).

| Variable | Used by | Default |
|---|---|---|
| `DESIGN_DIR` | every tool that reads the export | `./Design` under the current folder |
| `DESIGN_BACKUPS` | `install-export.py` | a `design-backups` folder beside `DESIGN_DIR` |
| `PLAYWRIGHT_MODULE` | browser tools | Playwright resolved from the current folder, then from this folder |
| `APP_URL`, `REFERENCE_PREFIXES` | contract checker | none: required |
| `SCENARIO_ENDPOINT`, `SCENARIO_HEADERS` | contract checker | none: required when a frame has a scenario and there is no `applyScenario()` |
| `AUTH_MODULE`, `STORAGE_STATE_DIR`, `SHELL_LABELS`, `PHONE_HEADER_HEIGHT`, `COMPONENT_PREFIX`, `PART_PREFIXES`, `UTILITY_PATTERN`, `THEME_ATTRIBUTE`, `HIDE_SELECTORS`, `LOCALE` | contract checker | see its section |

A design file's **code** is its name up to the first space, middle dot, hyphen or underscore: `P1 Payments.dc.html` is `P1`. Every tool accepts a code or a full file name.

## design.py: read an export without opening it

Each `.dc.html` file can hold megabytes of inline-styled markup on one long canvas. Opening one wastes context and hides the copy. `design.py` parses the files and prints only what you ask for.

| Command | What it prints |
|---|---|
| `python3 design.py files` | every design file, with its frame count |
| `python3 design.py outline P1` | section headings, notes and frame captions, in page order |
| `python3 design.py labels P1 Recipient` | frame ids and labels, filtered by a regex on either |
| `python3 design.py text P1 '^hx-p1-1-390$'` | the visible text of the matching frames |
| `python3 design.py links P1 '^hx-p1-1-390$'` | where each control in those frames leads (the prototype flow) |
| `python3 design.py find all 'name confirmed'` | every frame and note, in every file, whose text matches |
| `python3 design.py check all` | per file: duplicate frame ids and labels, links (`href="#…"` or `<file>.dc.html#…`) that land on no element, and retired anchors pointing nowhere; exits 1 if any |

Regexes are case-insensitive. Text outside frames is the section notes, and `find` searches them too.

## shoot.mjs: screenshot frames

`node shoot.mjs <file> <regex> [out-dir]` saves a PNG per matching frame (id or label) and prints the paths. It stops after 6 frames (`MAX=20` for more) and saves to `<system temp>/design-frames` unless given a folder.

- `DESIGN_SCROLL_BOTTOM=1` scrolls frame-local scroll areas to their ends first, to check that fixed action bars don't hide the last fields. Files get a `-bottom` suffix.
- `DESIGN_STANDALONE=1` with `DESIGN_DIR` pointing at an export's `standalone/` folder opens the bundled `.html` pages instead, for a file that won't render as `.dc.html`.
- Never pipe its output into `head`: a closed pipe ends the script before it closes its browser.

## install-export.py: install a new export

`python3 install-export.py <export folder or .zip> --name <label> [--expect <folder or fingerprints.json>] [--install] [--force]`

- **Without `--install`** it checks and reports: which canonical files changed, were added or were removed, and whether the export matches `--expect`.
- **`--expect`** takes the folder `run-pack-local.mjs` left (the result you verified), a pack's `fingerprints.json`, or an `expected-census.json`. A mismatch blocks `--install` unless you add `--force`.
- **With `--install`** it renames the current design folder to `<DESIGN_BACKUPS>/Design-before-<label>`, copies the export into its place, and checks every file byte for byte. Renaming is instant and makes the backup exactly the old folder.
- It refuses unsafe archives (absolute paths, `..`, symlinks, CRC failures) and files that aren't UTF-8 HTML. It never needs the export's `standalone/` folder, which some exports leave out.

## contract/: check the app against the designs

`check.mjs` compares each mapped design frame with the app page that implements it, at the frame's own width. It reads each frame's visible text, boxes, type and colour into a small JSON spec once (`specs/`, a few KB a frame), opens the mapped route, measures the page the same way (`extract.mjs`), and writes `reports/<time>/report.md` and `report.json`.

```sh
cd <work folder>/contract            # holds frame-routes.json and accepted.json
node <kit>/tools/contract/check.mjs --only '^hx-p1-'          # one area
node <kit>/tools/contract/check.mjs --refresh                 # after a new export: re-read the specs
node <kit>/tools/contract/check.mjs frame-routes-B.json       # a worker's own map
node <kit>/tools/contract/check.mjs --help                    # every flag and setting
```

- **Required settings.** `APP_URL` (the running app) and `REFERENCE_PREFIXES` (the prefixes of record references, such as `HX` for `HX-PAY-1042`; empty if there are none). The tool stops and names what is missing rather than guess.
- **The map** (`../templates/frame-routes.example.json`) lists, per frame: the design file code, the frame id, the route, the account to sign in as, and optionally a `scenario` and `steps`. Steps reach states behind clicks: `{ "click": "Continue" }`, `{ "fill": "Amount", "value": "1250.00" }`, `{ "check": "Standard" }`, `{ "press": "Enter" }`, `{ "wait": 800 }`, `{ "goto": "/path" }`; `"exact": false` matches by regex. Frames with a scenario or steps run one at a time after the rest.
- **Signing in.** `AUTH_MODULE` names a module exporting `openSession(browser, { app, account, ...contextOptions })`, returning `{ context, page }`, and optionally `applyScenario(page, { app, scenario })`. Without it, `STORAGE_STATE_DIR` can hold Playwright storage states named `<account>.json`. With neither, pages open signed out.
- **Scenarios** (named seed states of a review server) without `applyScenario` are applied by POSTing `{ scenarioId }` to `SCENARIO_ENDPOINT` with `SCENARIO_HEADERS`. Both are required in that case. A scenario that fails to apply is an error, never a silent run on default data.
- **What it ignores.** The app shell's navigation (`SHELL_LABELS`, and the phone header, `PHONE_HEADER_HEIGHT`) is left out of both sides, so check the shell separately. `HIDE_SELECTORS` hides dev tools that float over the app. Data that differs between the design's sample people and the app's accounts (amounts in any currency, dates, times, references, emails, phone numbers, long numbers) is matched by kind and place, so only its position and type are compared.
- **The theme.** Designs are drawn in one theme, so `THEME_ATTRIBUTE` (default `data-theme=light`) is set on the page before measuring.
- **Reading the report.**
  - "By component" names the app part (classes starting with `PART_PREFIXES`, default `hx`) that draws each repeated type or colour difference, so the fix lands once, in the component.
  - "Patterns across frames" lists differences that repeat in three or more frames. Each is one system decision.
  - Per frame, it lists copy missing, extra or different, the title offset, panel boxes, spacing, positions, type, colour and text widths beyond the tolerance (2px; `--tolerance`).
- **Accepted differences** go in `accepted.json` beside the map: `{ "frame": "<regex>", "kind": "<finding kind>", "match": "<regex on text and detail>", "reason": "<the decision>" }`. They show struck through, with the reason.
- **Limits.** It checks static layout, copy, type and colour. Interaction, focus, motion, real devices and screen readers need walks of their own. Visual findings and per-frame errors are written to reports; they do not automatically make the process exit nonzero. Inspect `report.md` and `report.json` even when the command succeeds. Use a disposable review app for scenario and action steps, which can change app data.

## linking/: change designs in bulk with fingerprinted script packs

Claude Design's `run_script` runs JavaScript against the project's files. These tools build a change locally, prove it, and hand Claude Design a pack whose script reproduces the change exactly, checked by SHA-256.

| File | What it is |
|---|---|
| `kit-link.js` | The toolkit Claude Design evaluates (`eval(await readFile('uploads/kit-link.js'))`). No imports, no network. SHA-256, census and verify, frame spans, `applyMarks`, `applyRewrites`, `linkLibrary`, `applyRemarks` and its proof `proveRemarks`, `unmark`. Library-aware steps take `{ stylesheets, screenClass }`; the default is the example library (`components/hx-tokens.css`, `components/hx.css`, `hx-screen`). |
| `kit-run.js` | The runner Claude Design calls in four phases (prepare, mark, finish, verify). It works on plain-named copies in `tmp/`, resumes across runs, stops each call after 8 seconds, and saves a file only when its fingerprint matches, or, for a file changed since the export, when the proof holds. A file already changed is reported under `already`, so a prompt can safely run twice. |
| `kit-install.js` | Installs library files and the components page, checking each by fingerprint (phases save and verify). |
| `kit-rules.js` | Appends a section of standing rules to `CLAUDE.md` once (`matchedExport`, then `already` on a second run). |
| `build-pack.mjs` | `node build-pack.mjs <before> <after> <pack> [--fixes fixes.json] [--protect <regex>] [--only <regex>] [--skip <regex>] [--result <dir>]`. Diffs your scripted change into a re-mark pack: marks, class, style and `data-state` per tag, plus exact text fixes (`[{ file, find, replace, count }]`; also for a frame's own tag). It runs the toolkit on the result and refuses anything the toolkit can't reproduce. `--skip` leaves out the components page when it travels whole in a library pack. |
| `build-library-pack.mjs` | `node build-library-pack.mjs <design> <pack> --files components/hx-tokens.css,components/hx.css --reference F1d`. Packs the library and the components page. |
| `build-rules-pack.mjs` | `node build-rules-pack.mjs <current CLAUDE.md> <section.md> <pack>`. Packs a section of standing rules. |
| `run-pack-local.mjs` | `node run-pack-local.mjs <copy of the project> <pack>`. Runs the pack the way Claude Design will: names with `·` or `,` refused, a 30-second limit per call, `copy_files` steps, phases repeated until done. Prints the result lines Claude Design should report. Give it a copy; it changes files in place. |
| `run-local.mjs census` | Fingerprints an export (`expected-census.json`), for a "check the project matches this export" step. |
| `index.mjs` | `node index.mjs <design> <out> [--since <earlier out>]`. Per frame: id, label, width, components and variants, links and a hash; which frames use each component; and, with `--since`, the frames added, changed and removed between two exports. |
| `compare-render.mjs` | `node compare-render.mjs <before> <after> <out.json>`. Renders every element of every frame before and after (page scripts off) and reports each difference against the marked part it belongs to: the proof that nothing changed except what was meant to. |
| `pack-common.mjs` | Shared by the builders. |
| `examples/halcyon/` | A complete small example: a sample design, the change script, the pack, its prompt, and how to rehearse it. |

The loop, end to end:

```sh
cp -R "$DESIGN_DIR" scratch/before && cp -R "$DESIGN_DIR" scratch/after     # 1. two copies of the current export
node my-change.mjs scratch/after                                             # 2. your change, as a script
node linking/build-pack.mjs scratch/before scratch/after packs/pack-3        # 3. the pack
cp -R scratch/before scratch/run && node linking/run-pack-local.mjs scratch/run packs/pack-3   # 4. rehearse the run
node linking/compare-render.mjs scratch/before scratch/run scratch/render.json   # 5. only the intended parts changed?
# 6. upload packs/pack-3 with a prompt (templates/claude-design-prompt.md)
# 7. when the owner exports: python3 install-export.py <export> --name pack-3 --expect scratch/run --install
```

Build packs from the export Claude Design has now. A file Claude Design changed after your export is saved only by proof, and a file the proof can't cover is reported under `failed` and left as it was.

## lib/playwright.mjs

Finds Playwright from `PLAYWRIGHT_MODULE` (playwright's `index.js`, its package folder, or a project folder), then the current folder, then this folder. It prints how to install it if none is found.
