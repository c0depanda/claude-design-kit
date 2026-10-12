# Getting started

This guide takes you from a clone of the kit to reusable foundations inside Claude Design and your first design handoff. The aim is to specify shared components, states, and layout rules early, so later screens stay consistent and implementation has fewer decisions to guess. Keep [the tools reference](../tools/README.md) nearby for flags, and read [WORKFLOW sections 1–3](../WORKFLOW.md#1-the-loop-and-who-does-what) before drawing a real project.

## 1. Install only what you need

| Task | Requirements |
|---|---|
| Read the workflow and use the prompt templates | Access to the relevant Claude Design features for your project |
| Read/check exports or install an export | Python 3.9+; no Python packages |
| Build packs, rehearse them, or index frames | Node.js 20+; Node's built-in modules only |
| Screenshot frames, compare renders, or run contract checks | Node.js 20+, Playwright, and its Chromium browser |
| Load the workflow in an implementation session | Claude Code with skills support (optional) |

Clone the repository and keep its path in your shell:

```sh
git clone https://github.com/c0depanda/claude-design-kit.git
cd claude-design-kit
export KIT="$PWD"
python3 --version
node --version
```

The shell examples target macOS/Linux or WSL. Install Python and Node if those commands are unavailable. For browser tools:

```sh
cd "$KIT/tools"
npm ci
npx playwright install chromium
```

Alternatively, reuse Playwright from your app by setting `PLAYWRIGHT_MODULE` to its absolute `node_modules/playwright/index.js` path. That installation also needs its matching Chromium browser. Linux may need browser system dependencies; see [Playwright's browser installation guide](https://playwright.dev/docs/browsers#install-system-dependencies).

First run the [README sample](../README.md#try-it-locally). It needs no live Claude project or app. For a complete local pack demonstration, follow the [Halcyon example](../tools/linking/examples/halcyon/README.md).

## 2. Give your project a separate workspace

Use this structure outside the kit:

```text
my-product/
├── Design/             # installed export; replaced on each install
├── work/
│   ├── env.local       # this project's paths and settings
│   ├── authoring/      # edited templates to give Claude Design
│   ├── contract/       # frame map, cached specs, reports
│   ├── packs/          # bulk changes sent to Claude Design
│   ├── ledgers/        # coverage, decisions, questions, backend asks
│   └── design-backups/
└── app/                # the implementation repository
```

Choose a real path in place of `/absolute/path/to/my-product`:

```sh
export WORKSPACE="/absolute/path/to/my-product"
export WORK="$WORKSPACE/work"
mkdir -p "$WORK/authoring" "$WORK/contract" "$WORK/packs" "$WORK/ledgers" "$WORK/design-backups"
cp "$KIT/tools/env.example" "$WORK/env.local"
cp "$KIT/templates/ledgers/"*.md "$WORK/ledgers/"
```

Edit `work/env.local`: set `KIT`, `DESIGN_DIR`, and `DESIGN_BACKUPS` to absolute paths in this layout. Keep optional settings commented until you need them. `DESIGN_DIR` must point to the directory containing the actual `.dc.html` files, not its parent or `standalone/` previews.

Load the settings in each new shell:

```sh
set -a
source "$WORK/env.local"
set +a
```

`WORK` and `WORKSPACE` are convenience variables for these examples; the tools use the settings in `env.example`. Environment files are shell code: load only a file you have reviewed. Keep local environment files and authentication state out of your project's version control too; the kit's `.gitignore` only covers this repository.

## Use the Claude Code skill

For all local Claude Code projects:

```sh
mkdir -p "$HOME/.claude/skills"
ln -s "$KIT" "$HOME/.claude/skills/claude-design-workflow"
```

For one app only, use `$WORKSPACE/app/.claude/skills/claude-design-workflow` as the link destination instead, creating its parent directory first. Choose one installation scope. If the destination already exists, inspect it before replacing anything. A symlink points at this clone, so keep the clone at a stable path; a checked-in absolute symlink will not be portable to another person's machine.

If symlinks are unsuitable, create the skill directory and copy `SKILL.md`, `WORKFLOW.md`, `templates/`, and `tools/` into it, excluding `node_modules/` and local settings. Set `KIT` to that copied directory, install its browser dependencies if needed, and update the copy when you update the kit.

Invoke `/claude-design-workflow` in Claude Code. If it is not listed, start a new session and check that the chosen skill folder contains `SKILL.md`. This follows [Claude Code's skill discovery and invocation conventions](https://code.claude.com/docs/en/skills).

A useful first request is:

```text
/claude-design-workflow Set up the design workflow for my product.
Kit: /absolute/path/to/claude-design-kit
Design export: /absolute/path/to/my-product/Design
Work folder: /absolute/path/to/my-product/work
App repository: /absolute/path/to/my-product/app
The app is new / already has a component library.
Implementation stack: <framework or server-side template system>.
Use the prompt-and-export handoff. Help me define the reusable components,
variants, states, and layout rules, then prepare the day-0 attachments.
```

For ongoing work, add the kit location and these project paths to the app's `CLAUDE.md`. Skill installation gives Claude Code instructions; it does not grant access to Claude Design or transfer files there.

## 3. Prepare Claude Design before asking for screens

In Claude's Artifacts tab, choose the **Design** template, or select **Output > Design** in a conversation. Attach your design system or component references along with the authoring notes and day-0 prompt prepared below. Use these same templates for an existing standalone Claude Design project. See [Claude Design's entry points](https://support.claude.com/en/articles/14604416-get-started-with-claude-design#where-you-can-use-claude-design).

Day 0 establishes the specification that later design sessions will reuse. Agree the following before expanding into feature screens:

- **The reusable parts and their names:** buttons, inputs, selects, navigation, cards, dialogs, and the other parts your product needs. In an existing app, use its actual names; for a new app, agree a small starting set.
- **Each part's variants and states:** sizes, tones, selected and disabled states, errors, and inner parts. Show them on the components page so both sessions can refer to the same examples.
- **The shared visual rules:** named tokens, page gutters, content widths, spacing, and how layouts change across the four frame widths. Use the library for component styling and frame notes for screen-specific rules.
- **How to handle a new requirement:** reuse an existing part where it fits; otherwise mark the proposed part as `New` and record the decision in the handoff. Keep the approved library and authoring rules current through the change-pack workflow.

For a non-React app, record how these names map to your stack's reusable components or templates. The design library describes how each part looks; the app supplies its framework-specific implementation and behaviour. This setup works through prompts and exports without a Design Sync connection.

Copy the starting files into `work/authoring/`:

```sh
cp "$KIT/templates/design-project-CLAUDE.md" "$WORK/authoring/CLAUDE.md"
cp "$KIT/templates/claude-design-day-0-prompt.md" "$WORK/authoring/day-0.md"
cp "$KIT/templates/claude-design-first-journey-prompt.md" "$WORK/authoring/first-journey.md"
```

Customise the copies, keeping the kit's templates reusable:

| Example value | Replace with |
|---|---|
| `Halcyon` | Your product name |
| `hx-`, `Hx`, `--hx-` | Your CSS classes, component names, and token prefixes |
| `components/hx-tokens.css`, `components/hx.css` | Your actual library file names |
| `F1c`, `F1d`, `P1` | Your email, components-page, and journey file codes |
| `<…>` placeholders and `Guide:` lines | Concrete project details; remove the drafting instructions |

Pick one route in the day-0 prompt and delete the other:

- **Existing app or design system (route A):** derive the token and component stylesheets from the app, build the library pack, and attach the files named in the prompt. This requires preparation by the implementation session; the kit's CSS skeletons are not a complete design system.
- **New product (route B):** attach the edited `CLAUDE.md` and the two [library skeletons](../templates/library/). Ask Claude Design to define foundations, write the shared library, and draw the components page before feature screens.

Give the edited day-0 prompt and its attachments to your Claude Design project. Review the components at 1440, 1024, 390, and 320. Then use `first-journey.md` to request one journey, attaching the [canvas skeleton](../templates/canvas-skeleton.dc.html) as a structural reference. Check that the result has separate, labelled frames for states and widths before asking for more journeys.

Ask Claude to read the authoring notes at the start of each new design conversation. Keep using the approved component names, tokens, and frame IDs as you add journeys. Before using route A or a later script pack, confirm the session provides `run_script`, `readFile`, `saveFile`, and `copy_files`; if it does not, leave the pack unapplied and report the missing capability.

If you already have designs, export and inspect them first. Identify missing IDs, library links, or component marks before choosing a migration pack; do not overwrite the existing project with the starter templates.

## 4. Export, check, and install

Export the Claude Design project source. The local tools expect `*.dc.html` files containing frames with `id` and `data-screen-label`, component marks, and their referenced styles and assets. Inspect the first export from a Design artifact for that structure; the tools have not yet been tested against a fresh Artifacts export. With a matching export, `DESIGN_DIR` and `DESIGN_BACKUPS` set, replace the archive path below with your download:

```sh
python3 "$KIT/tools/install-export.py" "$HOME/Downloads/my-product.zip" --name day-0
python3 "$KIT/tools/install-export.py" "$HOME/Downloads/my-product.zip" --name day-0 --install
python3 "$KIT/tools/design.py" files
python3 "$KIT/tools/design.py" check all
node "$KIT/tools/linking/index.mjs" "$DESIGN_DIR" "$WORK/index-day-0"
```

The first command reports without replacing your installed export; `--install` performs the replacement and backs up an existing design folder. Use a new backup label for each install. Copy any `HANDOFF-*.md` closeouts you need to retain from the export into `work/`.

Use the file codes and frame IDs printed by the tools, rather than the sample's IDs:

```sh
python3 "$KIT/tools/design.py" outline P1
python3 "$KIT/tools/design.py" labels P1
python3 "$KIT/tools/design.py" find all 'recipient'
node "$KIT/tools/shoot.mjs" P1 '^your-frame-id$' "$WORK/screenshots"
```

After a script pack, use `--expect` with the rehearsed result when checking and installing the next export. A mismatch requires investigation; see [the handoff loop](../WORKFLOW.md#5-the-handoff-loop).

## 5. Build and compare the app

Read frame notes, copy, links, and screenshots together. Implement the app with its shared components, and record coverage and intentional differences in `work/ledgers/`.

For contract checking:

1. Copy [frame-routes.example.json](../templates/frame-routes.example.json) to `work/contract/frame-routes.json`. Replace the example entries with real file codes, frame IDs, and app routes. Start with one frame; the example routes are not a bundled app.
2. Set `APP_URL` to your running local/review app and set `REFERENCE_PREFIXES` to your reference prefixes (or `""` for none). Set `COMPONENT_PREFIX` and `PART_PREFIXES` to your own class prefixes.
3. For signed-in pages, supply `AUTH_MODULE` or `STORAGE_STATE_DIR`. Use scenario and click/fill steps only when your app supports them. Scenario application and UI steps can change app data, so use a disposable review environment.
4. Run from the contract folder:

   ```sh
   cd "$WORK/contract"
   node "$KIT/tools/contract/check.mjs" --refresh
   ```

Read `reports/<time>/report.md` and `report.json`; generated specs live in `specs/`. Fix repeated component differences first. Create `accepted.json` as `[]` initially, then add only differences you have decided to accept, with reasons. The [accepted-differences example](../templates/accepted.example.json) shows the format; its sample exceptions are not defaults.

The checker reports findings without failing the process for visual differences, so a zero exit status is not approval. Review the reports, screenshots, keyboard flow, and interaction separately. Use `--refresh` after new exports or changes to extraction settings. Authentication and scenario hooks are app-specific; [the tools reference](../tools/README.md#contract-check-the-app-against-the-designs) explains their interfaces.

## 6. Make the next design change

- For a new screen or product decision, fill in [HANDOFF-brief.md](../templates/HANDOFF-brief.md) and give it to Claude Design.
- For repeated component/attribute changes, build and rehearse a script pack using the [worked example](../tools/linking/examples/halcyon/README.md). Review the render comparison before uploading the pack and its prompt.
- Export the result, check it against the rehearsal, install, re-index, and refresh contract specs.

## Troubleshooting

| Symptom | What to check |
|---|---|
| `No *.dc.html files` | `DESIGN_DIR` points to the folder containing canonical files; settings were exported in this shell. |
| A file code matches zero or several files | Run `design.py files`; use the exact file name if a code is ambiguous. |
| `Playwright not found` | Run `npm ci` in `tools/`, or set `PLAYWRIGHT_MODULE` to an existing installation. Remove a stale override. |
| Browser executable is missing | Run `npx playwright install chromium` from the same Playwright installation. |
| Screenshot says `no frame matched` | Run `design.py labels <code>` and copy a real frame ID into the regex. |
| An import fails for `review-auth.mjs` | Leave `AUTH_MODULE` unset until you have written that app-specific module. |
| Contract results show a sign-in page | Provide working auth/storage state; account names in the map do not sign in by themselves. |
| Pack reports `failed` or fingerprint mismatch | Get a fresh export and rebuild/rehearse the pack against it. |
| Export installer refuses the backup label | Pick a new `--name`; an existing backup has that label. |
| A skill link already exists | Inspect the destination and reuse it if correct; do not overwrite it blindly. |

To update the kit, run `git pull --ff-only` in its clone, then `npm ci` and `npx playwright install chromium` in `tools/` if browser dependencies changed. Re-copy a copy-based skill installation after updating. Keep project-specific edits in the work folder so updating the kit stays straightforward.
