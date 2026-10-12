# Claude Design workflow

How to design a product in Claude Design and build it into a real app quickly and faithfully. It is written for the product's owner, for any Claude Code session, and for any Claude Design project, and it assumes no knowledge beyond this kit.

The structure begins inside Claude Design: persistent authoring rules, a shared token and component library, a components page, and explicit screen states and behaviour notes. These give Claude Design a repeatable way to add screens while giving Claude Code a specification for reusable parts. The aim is to keep decisions consistent as the product grows and reduce the design choices implementation has to guess.

Every rule here comes with its reason, usually a problem that cost days on an earlier project. The biggest: screens were drawn with inline styles instead of one shared component library, and linking them back to a library afterwards took a long series of scripted prompts. Sections 2 and 3 exist so that never happens again.

**How to use this file.** Read sections 1 to 3 before starting a project. Then go to the section for the task at hand: asking Claude Design for changes (5), reading designs (6) or building and checking the app (7). Section 8 lists the pitfalls, and section 9 sets the kit up on a new project or machine. In commands, `$KIT` is this kit's folder, `$DESIGN_DIR` the installed export and `<work>` the project's work folder (9.3 sets them).

Examples throughout use **Halcyon**, an invented payments product whose component prefix is `hx` (`HxButton`, class `hx-button`). Its people, amounts and references are invented too.

Contents:

1. [The loop and who does what](#1-the-loop-and-who-does-what)
2. [Day 0: set up the Claude Design project](#2-day-0-set-up-the-claude-design-project)
3. [Draw a design canvas, not an app](#3-draw-a-design-canvas-not-an-app)
4. [Authoring rules for Claude Design](#4-authoring-rules-for-claude-design)
5. [The handoff loop](#5-the-handoff-loop)
6. [Reading designs fast](#6-reading-designs-fast)
7. [Implementing from designs](#7-implementing-from-designs)
8. [Pitfalls and fixes](#8-pitfalls-and-fixes)
9. [Using the kit on a new project or machine](#9-using-the-kit-on-a-new-project-or-machine)

---

## 1. The loop and who does what

**Claude Design** provides a design canvas, including through the **Design** template in Claude's Artifacts tab. Use the same foundations and journey prompts there as in a standalone Claude Design project. This kit specifies canvases of static frames, where a frame is one screen or state at one width (section 3). Its local tools read `*.dc.html` exports with the frame and component marks described below.

The script-pack workflow uses these project tools, originally used in standalone Claude Design:

- `run_script` runs JavaScript against the project's files, with `readFile` and `saveFile`;
- `copy_files` copies files inside the project;
- `show_to_user` and `eval_js` open a page and read values from it;
- files the owner attaches land in `uploads/`.

Before sending a script pack, check that the design session has the required file and script tools. If one is unavailable, report it and leave the pack unapplied. The component specification and design briefs remain the same. Export the project source and check its files against the kit's input requirements before installing it; a ZIP or HTML export alone does not establish compatibility.

**This workflow uses an explicit export handoff.** Claude Code reads local exports; changes travel as briefs or script packs the owner gives to Claude Design, and results come back as fresh exports. The workflow does not require Design Sync or a connector that can reach the design project's screen files, so it remains usable when a sync tool is unavailable or unsuitable for the project's stack. Keep screen-file changes on this handoff path so they can be checked against the export used to prepare them.

**The specification is independent of the app's framework.** The design library is HTML/CSS with named tokens and component marks. A name such as `HxButton` can map to a component, template, partial, or helper in the implementation's own stack; it is not a React requirement. Use the app's conventions and record that mapping when names differ. The kit's Python and Node tools run separately from the app, and its contract checker compares browser-rendered HTML/CSS. Native UI renderers need separate visual checks.

| Who | Does |
|---|---|
| **Owner** | Decides. Gives briefs and prompts to Claude Design, exports the project, and approves differences between the designs and the app. |
| **Claude Design** | Draws and changes frames under the project's `CLAUDE.md`, runs script packs, and writes a closeout for each brief. |
| **Claude Code** | Reads exports, writes briefs and prompts, builds and verifies script packs, installs exports, builds the app from the designs and checks it against them. |

When something is the owner's decision, Claude Code asks in the chat with the context, the options and a recommendation, and carries on with other work meanwhile.

**The loop:**

1. **Day 0:** set up the project: library, components page, authoring notes (section 2).
2. **Design:** Claude Design draws canvases from the library, following `CLAUDE.md` (sections 3 and 4).
3. **Hand over:** the owner exports. Claude Code checks and installs the export (5.6).
4. **Read:** Claude Code reads the designs with the tools, never by opening files (section 6).
5. **Build:** design-first, from the marked components, with the backend's data shape (section 7).
6. **Check:** the contract checker compares the app with each frame; ledgers record coverage, deltas, design questions and backend asks (7.3–7.4).
7. **Ask for changes:** a brief for design work, or a prompt with a script pack for bulk changes (5.1–5.5). Then back to step 3.

**Where things live.** A project's *workspace* is one folder holding the design export, a work folder and the app's repository. Keep them apart, because each export replaces the design folder whole.

| Folder | Holds | Rule |
|---|---|---|
| `<workspace>/Design/` | The latest export: `*.dc.html`, `components/` (the library), `_ds/` (the design system Claude Design binds to the project), `assets/`, the designer's `HANDOFF-*.md` closeouts | Read only. Never save notes, scripts, screenshots or briefs in it. |
| `<workspace>/<work folder>/` | Your briefs and prompts (`HANDOFF-*.md`), copies of the designer's closeouts, packs, the contract map (`contract/`), ledgers, `design-backups/` | Everything you write about the designs. |
| `<workspace>/<app>/` | The app's code and its own rules (`AGENTS.md` or `CLAUDE.md`) | The app's rules win over a design detail that breaks them. |
| This kit | Workflow, templates and tools | Shared by every project. Project files never go in it. |

---

## 2. Day 0: set up the Claude Design project

Do all of this before the first screen is drawn. Every item prevents a problem that is expensive to fix once hundreds of frames exist. The prompt that asks Claude Design to do it is `templates/claude-design-day-0-prompt.md`.

### 2.1 One library that mirrors the app

The project holds two stylesheets, linked by every design file:

- `components/hx-tokens.css`: the app's design tokens (colour, type, spacing, corners, borders, elevation, motion) under **the app's own names**, light under `:root` and dark under `[data-theme="dark"]`.
- `components/hx.css`: one rule per app component, variant, size and state, under **the app's own class names**. Component `HxButton` is class `hx-button`; its variant is `hx-button-primary`, its size `hx-button-md`, and its states are `data-state` values.

**Why.** When frames are drawn with inline styles, every redesign redraws the same parts by hand. They drift (four slightly different greys, three button heights), and implementation has to reverse-engineer each frame. Linking thousands of frames back to a library afterwards takes a long series of scripted prompts (section 8, first row). With the library in place from day 0, a frame names the app's component, a value is already the app's token, and a redesign changes one rule.

**Where it comes from:**

- **The app exists (or its design system does):** generate the token file from the app's token source (for example, compile its SCSS token files with sass and keep the custom properties), and write the component file from the app's components, one rule per variant, size and state, inner parts included, with values read from the running app's computed styles. Install both with a pack (`$KIT/tools/linking/build-library-pack.mjs`, then the day-0 prompt's route A).
- **A new product:** Claude Design draws the foundations and writes both files once, starting from `templates/library/`. The owner approves the component list, and the app's components are then built from the same names and values (route B).

Either way, after day 0 the library changes only through script packs from Claude Code, so the app and the designs change together. **Draw inner parts too**: a radio's ring, a switch's thumb, a select's chevron, a dialog's header, body and footer. A library that styles only the outer box draws a radio as a box and a word.

### 2.2 The components page

One design file (Halcyon's is `F1d Components linked to implementation`) shows every component at 1440, 1024, 390 and 320, with every variant and state side by side, each specimen captioned and drawn only with library classes and marks.

**Why.** It is the one place Claude Design looks a component up before drawing it, so new frames copy a whole, correct part instead of re-inventing one. It is also where the owner sees the library rendered and spots a wrong drawing in minutes. Show each specimen as it sits on a page: at its page gutter, inside the card or sheet it lives in, on the page colour behind it. A specimen shown bare at the frame edge teaches the wrong placement.

### 2.3 The authoring notes (`CLAUDE.md`)

Keep the authoring notes in `CLAUDE.md` at the project root where supported. In an Artifacts design conversation, attach the same notes and ask Claude to read them before drawing; supply them again in each new session unless you have confirmed they are loaded automatically. Keep the maintained copy in the work folder. Start from `templates/design-project-CLAUDE.md` and replace Halcyon's prefix, file codes and email file with the product's own.

**Why.** Rules given only in a chat are lost when the session ends. What a design file is, the save sequence, the library rules and the script limits must hold in every session, including ones started months later.

### 2.4 Marks

Every library part in a frame carries its component name and variant as attributes:

```html
<span class="hx-button hx-button-primary hx-button-md"
      data-component="HxButton" data-component-variant="primary" data-component-size="md">Continue</span>
<span class="hx-radio" data-component="HxRadio" data-state="checked"></span>
```

- `data-component`: the app component, in the app's spelling (`HxButton`, `HxPageHeader`).
- `data-component-variant`, `-size`, `-tone`, `-kind`, `-part`, `-shape`, `-surface`: the props that change how it looks. `-part` names an inner part (`thumb`, `icon`, `field`).
- `data-state`: `checked`, `on`, `off`, `disabled`, `error`.
- A part the library lacks: `data-component="New" data-component-name="Loyalty points card"`, listed in the handoff under "Needs a component".

**Why.** Marks let implementation read which component and variant a frame uses instead of guessing from pixels; the frame index (`index.mjs`) lists them per frame. Scripts can find and change parts exactly, and the contract checker can say which component draws a difference. Use `data-component*` only for these marks. If Claude Design has added attributes of its own, leave them in place and don't reuse their names.

### 2.5 The screen class and width tiers

Every frame drawn at a fixed width carries the class `hx-screen`. The library makes it a size container and puts its narrower values under container queries:

```css
.hx-screen { container: hx-screen / inline-size; }
@container hx-screen (width < 1200px) { … tablet … }
@container hx-screen (width < 700px)  { … phone … }
@container hx-screen (width < 355px)  { … narrow phone … }
```

**Why.** The canvas itself is wide, so media queries never fire inside a 390 frame. Container queries on the frame make phone sizes apply on their own, exactly where the app's breakpoints would. The tiers sit between the drawn widths: 1024 falls under 1200, 390 under 700 and 320 under 355. **Never give the class to an element sized by its content** (a specimen board, a note, a caption column): containment would collapse it to nothing.

### 2.6 Four frame widths

Draw each screen at 1440 (desktop), 1024 (tablet and small laptop), 390 (phone) and 320 (narrow phone).

**Why.** Each width changes layout decisions: what wraps, what stacks, which navigation shows, how long names and amounts fit. A width that isn't drawn becomes a guess in the app, and guesses are where most fidelity bugs come from. 320 catches the overflow and clipping that 390 hides.

### 2.7 Frame ids and labels

Each frame has a unique, stable `id` (`hx-p1-4-390`) and a `data-screen-label` that reads `<number> <journey> · <screen> · <variant> · <width>` (`P1.4 Send · Recipient · name confirmed · 390`).

**Why.** Briefs, closeouts, packs, the frame index, the contract map and the ledgers all cite frames by id. An id that changes breaks every one of them. The label is for people: it says what the frame shows and at which width. Keep the number and id when content changes; update the label.

### 2.8 Files, codes and emails

- **Names:** `<code> <title>.dc.html`, with letters, digits, spaces and hyphens only, for example `P1 Payments.dc.html`. **No `·` and no `,`**: Claude Design's scripts can't open such names, which forces a copy step on every script. (The tools also read names that use `·`.)
- **Codes** group the product: a letter for the area and a number, with a letter for each further file. Halcyon uses `F0` vision, `F1` foundations, `F1a` motion, `F1b` themes, `F1c` emails, `F1d` the components page, `S1` the app shell, and `P1`, `P1a`, `P2` for payments.
- **Emails are a separate set.** Email frames (labelled EMAIL) use presentation tables and inline styles, because email clients ignore external stylesheets, classes and container queries. One file (Halcyon's `F1c`) defines the email anatomy: letterhead, type with a fallback font stack, facts, one button, footer. Emails take no library classes or marks, and packs protect them (`--protect '\bEMAIL\b'`).

### 2.9 Day-0 checklist

1. Create the Claude Design project and the work folder (9.5).
2. Fill in `templates/design-project-CLAUDE.md`. For route A, build the library files and pack them (`build-library-pack.mjs`).
3. Send `templates/claude-design-day-0-prompt.md` with its attachments.
4. Review the components page with the owner at every width. Fix the library (through a pack) before any feature screen is drawn.
5. Ask for the first journey with `templates/claude-design-first-journey-prompt.md`, and check it is a canvas (section 3), not an app, before anything else is drawn.
6. The owner exports. Install it (5.6), then fingerprint it as the baseline: `node $KIT/tools/linking/run-local.mjs census --out <work>/census-<date>` and `node $KIT/tools/linking/index.mjs "$DESIGN_DIR" <work>/index-<date>`.

---

## 3. Draw a design canvas, not an app

**A design file is a long canvas of static frames, not an app.** It has no routing, no app state, no JavaScript behaviour, and no single responsive page that resizes. Every screen, every state and every width is its own frame, drawn as it looks at that moment. Interaction is shown by drawing the next state as another frame and linking to it: the control carries `href="#<frame-id>"`, and every link resolves to a frame on the canvas (or `<file>.dc.html#<frame-id>` in another file).

**Why.** Asked for a design, Claude Design can build a working, interactive prototype instead. That can't be reviewed state by state, can't be cited by frame id, hides the phone, error and empty states behind clicks and resizes, and can't be read by the tools or checked against the app. A canvas shows everything at once, so the owner reviews it in one scroll and implementation builds and checks it frame by frame. `templates/canvas-skeleton.dc.html` shows the layout below in a small Halcyon file.

### 3.1 The file header

Every file opens with a header that sets the story for every frame below it:

- **Eyebrow:** product and file code (`HALCYON · P1`).
- **Title and purpose:** one paragraph on what the file covers.
- **Principles** that govern the file (what every screen in it must respect).
- **Shared components:** which library parts and sizes apply here.
- **The journey** as numbered steps, each one line saying what happens and which frames show it (`1 RECIPIENT → 2 AMOUNT → 3 REVIEW → 4 RESULT`).
- **The cast and the sample data:** the invented people and roles used in every frame, and the accounts, amounts and references, so every frame tells one consistent story.
- **Superseded frames,** when frames are replaced: a note naming old and new, and each old id kept as a hidden anchor pointing to its replacement, so old links and citations still land: `<div id="hx-p1-1-0-1440" data-retired-to="hx-p1-1-1-1440" aria-hidden="true" style="height:0;overflow:hidden"></div>`.

### 3.2 Sections and groups

- **A section** (`<section>`, a column with a 28px gap) has an eyebrow (`1 · RECIPIENT`), an `h2` title, and a note. **The note is part of the spec:** what the screen is for, its rules, what must never appear.
- **A group** inside a section has a title and a short note, then **one row** (flex, no wrap, 28px gap, aligned to the top) holding the same screen and state at 1440, 1024, 390 and 320, left to right.
- **Each frame sits in a small column with a caption above it,** in mono uppercase: `1.1 RECIPIENT · NAME CONFIRMED · 1440`.
- **A flow reads left to right within a group, and top to bottom across groups.**

### 3.3 Frames

- **Fixed size:** `flex: none`, a fixed width and a minimum height per width: 1440×900, 1024×900, 390×844, 320×568.
- **The whole page, top to bottom,** not a viewport crop: the frame grows taller with its content.
- **Overlays are frames of their own.** A dialog, popover or bottom sheet is drawn over its page as a separate frame at exactly the viewport height (for example `height: 844px` at 390), captioned `· SHEET OVER 1.1` on phones and `· DIALOG OVER 1.1` or `· POPOVER OVER 1.1` on wider screens. A desktop dialog and a phone sheet are different frames because they are different designs.

### 3.4 States are frames

Draw every state a person can meet, each as its own frame: default, filled, validation error, loading, empty, couldn't load, success or result, processing or outcome unknown, view only or no permission, long names and amounts, and each persona that sees the screen differently. Not every state needs all four widths, but **a state that changes layout on phones is drawn at 390 and 320.**

**Why.** A state that isn't drawn is invented in the app, and invented states are where the app stops looking like the design (7.5).

### 3.5 Realistic data

One cast and one dataset per file: real-looking invented names and amounts (Ada Example, $1,250.00, reference HX-PAY-1042). Draw long values on purpose (a long name such as Bartholomew Example-Longfellow, an amount such as $1,250,000.00), so overflow is designed, not discovered.

---

## 4. Authoring rules for Claude Design

These live in the project's `CLAUDE.md` (from the template). They are repeated here with their reasons, so you can judge a case they don't cover.

**Canvas, components and layout**

- **Draw a canvas of static frames, never an app** (section 3). *Why: only frames can be reviewed, cited, read by the tools and checked against the app.*
- **Draw parts from the library**, copying the whole part from the components page: inner elements, classes, marks and `data-state`. *Why: a part copied whole renders like the app; a part redrawn by eye starts a drift.*
- **Layout stays in the frame, written with tokens** (`var(--hx-space-16)`), never literal values. *Why: tokens are the app's names, so layout transfers directly.*
- **Never restate inline what the library sets** (type, colour, padding, border, corners, height). *Why: an inline copy freezes today's value and hides the frame from the next library change.*
- **Flag what's new:** `data-component="New"` plus a name, and "Needs a component" in the handoff. *Why: a new component is a decision for the owner and work for the app; unflagged, it hides as a one-off.*
- **Keep what's there:** a part that stays keeps its classes, marks, `data-state` and its frame's screen class. *Why: a careless redraw silently unlinks parts the packs linked.*
- **Never edit the library or the components page by hand.** *Why: they mirror the app; only packs keep the two in step.*

**Saving and scripts**

- **Save through the exact sequence:** a working copy saved by `run_script`'s `saveFile` as `tmp/<name>.html`, then `copy_files` onto the canonical `.dc.html` name with `asset: ""`, then delete the working copy. *Why: `copy_files` keeps the source's stored type, so copying a `.txt` onto a design makes it `text/plain` and the canvas shows source code; and `saveFile` rewrites `·` to `-`, so it can't write a `·` name directly.*
- **Script limits:** `run_script` can't open names containing `·` or `,`, and stops each run after 30 seconds. Copy files to plain names in `tmp/` first, keep progress in a small JSON file, and work in resumable batches of about 8 seconds.
- **Retire generators.** Scripts that rebuild frames from scratch reproduce them without the library. Edit frames in place.

**Working with Claude Code**

- **Never ask Claude Design to read, restyle or audit frames by hand.** Give it scripts that do the work and print one line. *Why: a product's design files run to hundreds of megabytes, tens of millions of tokens to read once, and hand edits across thousands of frames are neither repeatable nor checkable.*
- **Every handoff names the frames it changed, added and removed, by id.** *Why: Claude Code installs exports by diffing them; ids turn "I updated the send flow" into a list it can check.*
- **Report in a few lines**, and record each prompt's result lines in `audit/LEDGER.md` in the design project, so a restarted session knows where it stopped.

---

## 5. The handoff loop

### 5.1 Brief or pack?

| Use | When | Template |
|---|---|---|
| **A brief** (`HANDOFF-<topic>-<date>.md`) | The change needs design judgement: new states, flows, decisions, copy, a few frames | `templates/HANDOFF-brief.md` (a new journey: `templates/claude-design-first-journey-prompt.md`) |
| **A prompt with a script pack** | The change is mechanical and wide: marks, a variant or token across many frames, a library update, a decided restyle | `templates/claude-design-prompt.md` |

Keep both in the work folder, never in the design folder: the next export replaces it.

### 5.2 Writing a brief

- **Decisions are final** and stated as decisions, one line each. If a decision conflicts with a frame the brief doesn't list, Claude Design follows the decision and lists the frame in its closeout.
- **Name every frame by id and width**, the final copy in quotes, and for each new frame an existing frame to copy as its pattern.
- **Give layout numbers, not adjectives:** each family's container (left edge and title top at 1440 / 1024 / 390 / 320), measured from the existing frames. Ask for the measurements in the closeout. *Why: without them, pages shift as a journey moves on.*
- **Search the designs first** (6.3): most "missing" screens exist in another file or a note.
- **Ask for a closeout** listing frames changed, added and removed, links re-pointed, measurements, "Needs a component", and anything not done.

### 5.3 Writing a prompt

Model it on `templates/claude-design-prompt.md`. Send the series rules once, then one short prompt per pack:

- **Why**, in two or three bullets with counts.
- **What this does**: a table of part kinds, what they were, what they become and how many; what looks different (backed by your render comparison); what is left alone and why.
- **Steps**: the exact `run_script` calls, the `copy_files` calls in order, and the expected result values (`saved: 49`, `verified: 49`, `failed: []`).
- **From now on**: the standing rules the change implies, so the next redesign keeps it.

`tools/linking/examples/halcyon/` is a complete small example: a sample design, the change script, the pack and its prompt.

### 5.4 Building a pack

A pack is a few files Claude Design uploads to `uploads/`: the toolkit (`kit-link.js`), a runner (`kit-run.js` for marks and restyles, `kit-install.js` for the library, `kit-rules.js` for standing rules) and a data file with the change and its fingerprints.

1. **Start from the export Claude Design has now.** Ask the owner for a fresh export if anything changed since the last one. Install it (5.6).
2. **Make two copies** of it in a scratch folder: `before` and `after`.
3. **Make the change on `after` with a script**, never by hand, so it can be rerun on a fresh export. It may change marks, class, style and `data-state` on parts inside frames. Text changes, and changes to a frame's own tag (its label or class), go in a `fixes.json`: exact find, replace and count.
4. **Build the pack:** `node $KIT/tools/linking/build-pack.mjs before after packs/<name> [--fixes fixes.json]`. It lines up every tag, refuses anything the toolkit can't reproduce, runs the toolkit on the result and records each file's fingerprint before and after. Library changes: `build-library-pack.mjs after packs/<name> --files <library files> --reference <components page>` into the same pack folder, and leave the components page out of `build-pack.mjs` with `--skip '^<its code> '`: it travels whole in the library pack. Standing rules for `CLAUDE.md`: `build-rules-pack.mjs`.
5. **Rehearse Claude Design's run:** copy `before` to `run`, then `node $KIT/tools/linking/run-pack-local.mjs run packs/<name>`. It enforces the sandbox's limits and prints the lines Claude Design should report. Run it a second time to see that a repeat changes nothing (`already`).
6. **Prove nothing else changed:** `node $KIT/tools/linking/compare-render.mjs before run render.json` renders every element of every frame before and after. Every difference must be one you meant. For a library change, also look at the components page at every width.
7. **Write the prompt** with the numbers from steps 4–6, and hand it to the owner with the pack folder. The owner attaches every `.js` and `.json` file in it except `fingerprints.json`, which stays with you as the record.

**Proof for files that changed since the export.** If Claude Design edited a file after your export, its fingerprint won't match. The runner then saves the file only if it can prove that nothing but the listed parts changed (every listed pattern found exactly as often as verified, and look-alikes told apart by the text after them). Otherwise it reports the file under `failed` and leaves it as it was. Rebuild the pack from a fresh export for any file that failed.

### 5.5 When Claude Design reports back

- **`ok: true`, `failed: []`, `wrong: []`**: done. The owner exports; install it with `--expect` (5.6).
- **`already: [...]`**: those files were already changed (the prompt ran twice). Nothing to do.
- **`markedByProof: [...]`**: those files had changed since the export and were changed by proof. Expected; note them.
- **`failed` or a mismatch**: nothing was saved for those files. Never ask Claude Design to fix it by hand. Find out what changed (the owner, another prompt), rebuild the pack from a fresh export, and send it again.
- **A wrong-looking result the scripts called correct** (a components page that draws radios as boxes, say): the pack did what it was built to do, so the build was wrong. Fix the builder, check inner parts and placement, and send a follow-up prompt.

### 5.6 Installing a new export

```sh
python3 $KIT/tools/install-export.py ~/Downloads/<export>.zip --name <label>                 # check and report only
python3 $KIT/tools/install-export.py ~/Downloads/<export>.zip --name <label> --expect <run folder or fingerprints.json> --install
```

1. **Check** first. It lists the canonical files changed, added and removed, and with `--expect` whether the export matches the result you verified.
2. **Investigate any mismatch** before installing. A small later edit by the owner is normal (`--force` once understood); a pack that didn't apply is not.
3. **Install.** The current folder is renamed to `design-backups/Design-before-<label>`, the export is copied in, and every file is checked byte for byte. Without the tool, the same steps by hand are: back up (`ditto Design design-backups/Design-before-<label>`), copy (`rsync -a --delete <export>/ Design/`), then compare every file's SHA-256 with the export's.
4. **Copy the designer's new `HANDOFF-*.md` closeouts** into the work folder. The next export replaces the design folder, and older copies inside an export can be stale; the newest dated document is the authority unless your phase brief says otherwise.
5. **Re-index:** `node $KIT/tools/linking/index.mjs "$DESIGN_DIR" <work>/index-<date> --since <work>/index-<previous date>` lists the frames added, changed and removed: the work list for implementation.
6. **Check the canvas:** `python3 $KIT/tools/design.py check all` lists duplicate ids and labels, and links that resolve to no frame.
7. **Refresh the contract specs:** `node $KIT/tools/contract/check.mjs --refresh --specs-only` in the contract folder.

### 5.7 Disk space

An export is 0.25–5 GB with its assets, and every install keeps a backup. Review copies, staging folders and backups can fill a disk mid-run, and then every agent's writes fail at once.

- Before a long run, check `df -h` and `du -sh <work>/*`.
- Keep: briefs and closeouts, packs, the contract folder, ledgers, the newest backup and any backup an open brief names.
- Move superseded export copies and older backups to the Trash, with the owner's agreement. The Trash frees nothing until it is emptied.

---

## 6. Reading designs fast

**Never open a `.dc.html` file whole.** A file can hold megabytes of inline-styled markup; reading it wastes context, and the copy is lost among the styles. A plain `grep` prints lines thousands of characters long.

### 6.1 The tools

Set `DESIGN_DIR` to the export (or run from the folder that holds `Design/`). A file is named by its code: `P1`, `P1a`, `F1d`.

| Command | What it gives |
|---|---|
| `python3 $KIT/tools/design.py files` | every design file, with its frame count |
| `python3 $KIT/tools/design.py outline P1` | the header, section headings, notes and frame captions, in page order |
| `python3 $KIT/tools/design.py labels P1 Recipient` | frame ids and labels, filtered by a regex on either |
| `python3 $KIT/tools/design.py text P1 '^hx-p1-4-390$'` | the visible text of the matching frames |
| `python3 $KIT/tools/design.py links P1 '^hx-p1-4-390$'` | where each control leads: the prototype flow |
| `python3 $KIT/tools/design.py find all 'name confirmed'` | every frame and note, in every file, whose text matches |
| `python3 $KIT/tools/design.py check all` | duplicate ids and labels, and links that resolve to no frame |
| `node $KIT/tools/shoot.mjs P1 '^hx-p1-4-390'` | PNG screenshots of the matching frames |
| `<work>/index-<date>/frames/P1.json` | per frame: id, label, width, components with variants, links |

### 6.2 The reading order

1. **Start from the brief or closeout** that names the files and frame ids. Its decisions override older ones.
2. **`outline`** each file it names, to read the header (journey, cast, principles) and the section rules.
3. **`labels`** to list every state and width of the screen, not just the one cited.
4. **`text`** to take the copy exactly. The design's copy is the copy.
5. **`links`** to follow the journey: what each button opens, where Back returns.
6. **`shoot`, and look at the image,** whenever layout matters. Extracted text can't tell a placeholder from a value, a hint from an error, or a disabled button from an enabled one.
7. **The frame index** for which components and variants to use.

### 6.3 Search before calling something a gap

Before saying a screen, state or rule is missing, search every file, notes included, with several phrasings and the section intros: `design.py find all '<words the screen would use>'`. Frame labels vary, and many rules live in the notes between frames. Only then call it missing, and name what the designs already cover next to what is left. A rule that contradicts one sentence of a frame changes that sentence, not the whole designed state.

### 6.4 Reading correctly

- **Notes are part of the spec.** They state what frames can't show.
- **Sample data is a fixture.** Names, amounts, banks and dates show the shape; real data comes from the backend. Never hard-code them.
- **A static frame doesn't define behaviour.** When a brief or note describes behaviour (what clears a field, what gates Continue), the description wins over what one frame happens to show.
- **Two frames linked by a checkbox are two states of one form,** not two pages. Frame variants are states, contexts and widths of one screen; never turn frames into routes.
- **`ROUTE` frames** only point to the file that owns the screen.
- **The app's rules win** over a design detail that breaks them (a literal colour, a pixel value, data the backend lacks): match the design with the app's components and tokens.
- **Ignore** `standalone/` (bundled previews; open one only if a `.dc.html` won't render, with `DESIGN_STANDALONE=1`), `tmp/`, `screenshots/`, `uploads/`, `tools/` and the design project's own `CLAUDE.md`. Ask the owner before building from exploration files.

---

## 7. Implementing from designs

### 7.1 Design-first building

- **Build every designed element.** Remove one only when it is something the owner said won't be built, a scope change, a duplicate of an existing component, an edge case that shouldn't exist (faked success, a figure from another record), or no longer in the design.
- **Data comes from the backend.** Where the backend lacks data or behaviour a designed element needs:
  1. build the element;
  2. write a backend ask (`templates/ledgers/backend-asks.md`), in the backend's own resource shape;
  3. a mock, if the project has one, may serve it in that shape meanwhile, and only as far as the designed screen and its edge cases need. Against the real backend, the element shows its unavailable state.
  Never fill it with sample values in the browser or a backend-for-frontend.
- **The mock is not a second backend.** Resources, not screen-shaped responses or command unions, and no business rules. *Why: a mock that plays the backend grows a screen-shaped contract that matches nothing the real backend offers, and all of it is rework.*

### 7.2 Use the marks

- The frame's `data-component*` marks name the component and variant to use. Use the shared component; never restyle it per page.
- When a frame and a shared component disagree, fix the drift once, in the component, and recheck its other users. If the design is the one that's wrong, record a delta (7.4) and send it back in a brief.
- When a design change makes a component or file obsolete, remove it: keep a copy in the Trash, remove it in a commit of its own, prune styles only it used, and list it with its replacement.

### 7.3 The contract checker

`$KIT/tools/contract/check.mjs` compares each design frame with the app page that implements it, at the frame's own width: copy, the title's offset, panel boxes, spacing, positions, type and colour. It reads dozens of frames in about a minute from small cached specs, where screenshot sweeps take hours and fill the disk.

1. **Map every frame you build** in `<work>/contract/frame-routes.json` (`templates/frame-routes.example.json`): the file code, frame id, route, account, and a `scenario` or `steps` for states behind clicks.
2. **Set its required settings** (`APP_URL`, `REFERENCE_PREFIXES`, and the scenario settings if frames use scenarios; see `tools/README.md`).
3. **Run it after each UI change and in final QA:** `node $KIT/tools/contract/check.mjs --only '<area regex>'` from the contract folder.
4. **Read "By component" first:** a difference repeated across frames is one fix in one component.
5. **Record decided differences** in `accepted.json` with the reason and the delta number. They show struck through.
6. **Keep a few real screenshots for feel,** and walk interaction, focus and motion separately: the checker sees static layout only.

### 7.4 Ledgers

Keep these in the work folder. When several Claude Code workers run in parallel, each keeps its own and the lead session merges them. Templates are in `templates/ledgers/`.

- **Phase ledger**: the briefs a phase implements and, per item, its status (☐ to do, ◐ in progress, ☑ done with its commit, ⏸ waiting on the owner or the backend) and what remains.
- **Coverage**: one row per frame family, with exactly one status: static scan, visually reviewed, journey exercised, fixed and rechecked, blocked, or excluded. "Visually reviewed" means you rendered the frame and the app at the same width and looked at both. "Not walked for time" is never a status.
- **Design deltas**: where the app departs from a drawing on purpose, one line each: file, frame ids, what the drawing shows, what the app does, and the decision behind it. They go to the next design pass as a brief.
- **Design questions**: gaps and edge cases found while walking journeys, after searching every design (6.3): what the designs cover, what is missing, what to decide.
- **Backend asks**: per gap, the screen, optionally what the API offers today, and one line per missing field or endpoint. Check the whole API spec first; anything the app can work out itself is not an ask.

### 7.5 Baseline quality the owner expects without being told

- **Submit states.** Every button that calls an API shows loading and is disabled until the call settles, so a second click can't send a duplicate. If success navigates away, it stays loading until the next page takes over. On failure it re-enables. Every input is the shared input component with the placeholder the design draws.
- **No loading flash.** Moving between pages shows no interim "Loading…" or "Preparing…" text: whole-region loading text appears only after a short delay (about 200 ms). A filter change keeps the list and its controls mounted, marked busy; skeletons are for the first load only. List rows open from anywhere on the row.
- **No invented errors.** Show only error states the design draws. A secondary read that fails (totals, side panels) raises an error toast with the reference and Try again, and the figures show a neutral dash; a page's main read keeps its designed error state. Never write "Unavailable" while loading. Inside a modal, keep the failure in the dialog, because the dialog's focus trap makes a toast's action unclickable.
- **Copy uses what's on screen.** A copy button copies the visible value and shows the control's Copied state.
- **Every width.** 1440, 1024, 390 and 320, plus widths in between. Check horizontal overflow and exactly one visible `h1`.
- **Enlarged text.** 150% and 200% at 390 and 320 for pages you change. In Chromium phone emulation, apply `-webkit-text-size-adjust`, then look for overflow, clipping and overlap. Measure before any full-page screenshot (a full-page capture drops the text size for the rest of that page's life), and ignore the hidden content of a closed `<details>`, which still reports boxes.
- **WebKit.** Walk each changed journey once in WebKit at 1440 and 390. Say "Chromium phone emulation" or "WebKit phone emulation": no emulation is a real device.
- **Keyboard and assistive tech.** Focus moves into a dialog on open, Escape closes it, and focus returns to the control that opened it. Status changes are announced.
- **Themes and stress.** Light and dark, long names, long amounts and many items.

### 7.6 Running checks safely

- **One browser walk at a time per account.** Applying a review scenario (a named seed state the mock can switch to) signs out every other session on that account, which looks like an app bug. Run scenario walks alone.
- **Before final QA, apply every stable review scenario once** and list any that fail: a change to shared seed data breaks scenarios nobody walked.
- **Route sweeps skip catch-all routes** (`[...section]`). Walk those pages separately.
- **zsh doesn't split words in `"$var"`.** In a loop, pass each argument explicitly (or use `${=var}`); otherwise "member 1440" arrives as one argument and the failure looks like an app bug.
- **Wait on named process ids.** In a script that starts a server with `nohup … &`, capture each job's id and `wait $a $b`; a bare `wait` also waits for the server, forever. Write a progress line per step, and read it before reporting status.
- **Check what's committed, not just the working tree.** When several workers stage parts of shared files, a commit can contain a file that doesn't parse while every check passes on the working tree. Before the final gate, make `git status` clean or parse-check changed files at `HEAD`.
- **Don't pipe browser tools into `head`.** The closed pipe ends the script before it closes its browser.

### 7.7 Phases with several workers

- **Write binding worker rules once per phase:** the briefs that govern, each worker's frames and files, the environment (URLs, accounts, tools), the QA lock, git rules, ledger formats and the final report's contents. Every worker reads them first.
- **One lock for browser walks**, taken with `mkdir` and released only by its owner, so walks never collide on shared accounts or a shared server.
- **Workers own files.** A worker commits only whole files it owns, or checks that its staged copy parses; shared components change only after the lead agrees.
- **Only the lead restarts shared servers and runs the heavy gates** (type checks, full lint), one at a time. Heavy jobs side by side can exhaust a machine's memory and kill every server at once.
- **Size the team to the machine.** On a 24 GB laptop running other heavy apps, three workers plus the lead was the safe maximum.

---

## 8. Pitfalls and fixes

Each row is a problem an earlier project hit, and the rule in this kit that prevents it.

| Pitfall | What happened | Fix |
|---|---|---|
| Screens drawn with inline styles, no shared library | Tens of thousands of frames carried hundreds of thousands of inline styles and literal colours; linking them to a library took a long series of scripted prompts | Day 0: library mirroring the app, components page, `CLAUDE.md` rules, marks (section 2) |
| Claude Design built a working app instead of frames | A new project came back as an interactive, responsive prototype: no frame ids, phone and error states hidden behind clicks, nothing the tools could read | Draw a canvas, not an app (section 3), in `CLAUDE.md` and the first-journey prompt |
| A design shows `<!DOCTYPE html>` source instead of the canvas | `copy_files` of a `.txt` onto a `.dc.html` stored it as `text/plain` | The save sequence: `saveFile` to `tmp/*.html`, then `copy_files` with `asset: ""` |
| Scripts can't open or save design files | `run_script` refuses names with `·` or `,`; `saveFile` turns `·` into `-` | Plain file names; packs work on plain-named copies in `tmp/` |
| Script runs cut off | `run_script` stops after 30 seconds | Batches of about 8 seconds that resume from a progress file |
| Prompts that make Claude Design read or restyle frames | Hundreds of megabytes of designs cost tens of millions of tokens to read; hand edits can't be checked | Script packs: Claude Design runs a script and reports one line; fingerprints decide |
| A sync connector on screen files | It only reaches design-system projects, and risked overwriting designs | Briefs and packs through the owner; exports back |
| Briefs lost or stale | Briefs saved inside the export were replaced by the next export | Briefs live in the work folder; copy closeouts out on install |
| Generators in the design project's `tmp/` | Scripts rebuilt frames without the library; `tmp/` grew to gigabytes | Edit frames in place; delete generators |
| Automatic marking confused look-alikes | Success ticks were marked as checked radios, switch thumbs as radios, icon buttons as code cells | Mark by role and inner parts; review a census of each component's looks before marking |
| Components page drew radios and switches as a box and a word | The library measured only outer boxes | Inner-part rules; verify inner parts against the most common whole drawing |
| Components page specimens misplaced | Specimens copied without their container, gutter or page colour | Copy specimens in place; audit placement against the source frame |
| Approved boards left out of the components page | The specimen chooser skipped a whole review file the owner had approved | Ask which boards are canonical before choosing specimens |
| A container class collapsed a frame | Content-sized elements were given `inline-size` containment | Only fixed-width frames carry the screen class |
| Render checks disagreed with the source | The design runtime rewrites `style` attributes as it runs | Harvest and compare with page scripts off |
| Packs refused files | Files changed after the export the pack was built from | Proof path for small drifts; rebuild from a fresh export; tell the owner about edits between prompts |
| Export install script failed | Some exports leave out `standalone/` | `install-export.py` checks canonical files only |
| Disk full mid-run | Export copies and backups grew the work folder to hundreds of gigabytes | Check `df` before long runs; keep the newest backup; Trash the rest with the owner's agreement |
| UI fidelity checks took hours | Screenshot sweeps and full export copies | The contract checker: specs once, DOM against DOM, about a minute for dozens of frames |
| Designed screens reported as gaps or replaced | Labels vary and rules sit in notes | `design.py find all` with several phrasings, notes included, before calling a gap |
| A contract of hundreds of screen-shaped methods | The mock played the backend | Backend asks in the backend's resource shape; the mock serves only what screens need |
| Invented "Unavailable" and inline Try again | Errors the design never drew | Toast with Try again for secondary reads; designed error states only |
| "Preparing…" flashes between pages | Interim loading text on fast navigation | Delayed loading status; keep controls mounted on filter changes |
| Double submits, buttons live during redirects | Hand-built inputs and buttons | Shared inputs; loading and disabled until settled; hold through redirects |
| False text-scale results | Full-page captures reset text size; closed `<details>` report boxes | Measure first, capture at viewport size, exclude closed details |
| Sweeps "failed to sign in" | zsh passed an account and a width as one argument | Explicit arguments or `${=var}` |
| Parallel walks signed each other out | Applying a scenario revokes the account's other sessions | Scenario walks run alone |
| Final checks "running" for hours | A bare `wait` waited on the server | `wait` on named ids; progress lines |
| Gates passed on a broken commit | Partial staging committed an unparseable file | Clean `git status` or parse-check `HEAD` before the final gate |

---

## 9. Using the kit on a new project or machine

### 9.1 Get the kit

Clone the kit with `git clone https://github.com/c0depanda/claude-design-kit.git`, then set `KIT` to the clone's absolute path. Start with the [getting-started guide](docs/getting-started.md) for a runnable sample and project setup. To move it offline, bundle it with `git bundle create claude-design-kit.bundle --all`, then on the other machine run `git clone claude-design-kit.bundle claude-design-kit`.

### 9.2 Install the tools

- **Python 3.9 or later** (check with `python3 --version`).
- **Node 20 or later**, for example through nvm.
- **Playwright with Chromium**, for screenshots, render comparisons and the contract checker. Either point `PLAYWRIGHT_MODULE` at a project that already has it (`<app>/node_modules/playwright/index.js`), or install it in the kit once: `cd "$KIT/tools" && npm ci && npx playwright install chromium`.

### 9.3 Settings

Copy `$KIT/tools/env.example` to `$KIT/tools/env.local` (git ignores it) and fill in `KIT` (this kit), `DESIGN_DIR` (the installed export), and `DESIGN_BACKUPS`. Enable `PLAYWRIGHT_MODULE` only to reuse another installation. For contract checking, set the app's URL, reference prefixes, and any sign-in or scenario settings your app needs; leave placeholder modules commented out. Load it in each shell with `set -a; source <kit>/tools/env.local; set +a`. Every variable is described in `tools/README.md`. No Claude API key is required; keep app credentials and browser storage states outside version control. A second project gets its own copy of the file, kept in that project's work folder.

### 9.4 Install the kit as a Claude Code skill

The kit's `SKILL.md` lets Claude Code load this workflow whenever a task involves Claude Design or building from its exports.

```sh
mkdir -p ~/.claude/skills
ln -s "$KIT" ~/.claude/skills/claude-design-workflow
```

- The link name should match the skill's `name` (`claude-design-workflow`).
- For one repository only, link it into that repository's `.claude/skills/` instead.
- Start a new Claude Code session and mention a Claude Design task; it should read `WORKFLOW.md`. If your Claude Code version doesn't follow symlinked skill folders, copy the folder instead and re-copy after updating the kit.

### 9.5 Start a new project

1. **Workspace:** `<workspace>/Design/` (exports land here), `<workspace>/<work folder>/` with `contract/`, `packs/`, `ledgers/` and `design-backups/`, and the app repository.
2. **Point the app's rules here:** add a line to the app's `CLAUDE.md` or `AGENTS.md`: "Designs come from Claude Design; follow the claude-design-workflow skill (WORKFLOW.md)."
3. **Fill in the design project's `CLAUDE.md`** from `templates/design-project-CLAUDE.md`.
4. **Run Day 0** (2.9).
5. **Copy the ledger templates** into the work folder at the start of each implementation phase.

### 9.6 Keep the kit current

When a project teaches a new lesson, add it here: the rule with its reason in the right section, and a row in section 8. Keep examples in Halcyon terms, with no real product, company or person.
