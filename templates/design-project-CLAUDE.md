<!--
Template: the authoring notes for a Claude Design project. Save it as CLAUDE.md at the project's root on day 0.
It is written for Halcyon, an invented example product whose class prefix is "hx". Replace "hx-" and "Hx" with your
app's class and component prefixes, and the file codes (F1c, F1d, P1) with your own. Then delete this comment.
-->

# Project authoring notes

These notes apply to every session in this project. The designs are built into a real app, so they follow the app's component library, and every change is reviewed by scripts that read the files. Where a brief or prompt from the implementation team disagrees with these notes, the brief wins for that task only.

Use these same notes in a Design artifact. Read them before drawing and retain the approved component names, states, and frame IDs across conversations. The file-saving and script-pack instructions require the named tools: check they are available before using those steps, and report a missing capability instead of substituting an unverified save operation.

## A design file is a canvas of frames, not an app

Never build a working app, an interactive prototype or one responsive page that resizes: they can't be reviewed state by state, cited by frame id or checked against the app. A design file is one long canvas of static frames.

- **No routing, no app state, no JavaScript behaviour.** Every screen, every state and every width is its own frame, drawn as it looks at that moment.
- **Interaction is a link to the next state's frame:** the control carries `href="#<frame-id>"` (or `<file>.dc.html#<frame-id>`). Every link resolves to a frame on the canvas.
- **The file header** comes first: an eyebrow with product and file code (`HALCYON · P1`); the title; a one-paragraph purpose; the principles that govern the file; the shared components and sizes that apply; the journey as numbered steps (`1 RECIPIENT → 2 AMOUNT → …`, each a line saying what happens and which frames show it); the cast (invented people and roles) and sample data (accounts, amounts, references) every frame uses; and a "superseded" note when frames are replaced.
- **Replaced frames** keep their old id as a hidden anchor pointing to the replacement: `<div id="<old-id>" data-retired-to="<new-id>" aria-hidden="true" style="height:0;overflow:hidden"></div>`.
- **Sections** (`<section>`, a column with a 28px gap): an eyebrow (`1 · RECIPIENT`), an `h2` title and a note. The note is part of the spec: what the screen is for, its rules, what must never appear.
- **Groups** inside a section: a title and a short note, then one row (flex, no wrap, 28px gap, aligned to the top) holding the same screen and state at 1440, 1024, 390 and 320, left to right. Each frame sits in a small column under a mono uppercase caption: `1.1 RECIPIENT · NAME CONFIRMED · 1440`. A flow reads left to right within a group and top to bottom across groups.
- **Frames** are `flex: none`, with a fixed width and a minimum height: 1440×900, 1024×900, 390×844, 320×568. A frame shows the whole page, top to bottom, and grows with its content; it is never a viewport crop.
- **Overlays** (dialog, popover, bottom sheet) are separate frames drawn over their page at exactly the viewport height (`height: 844px` at 390), captioned `· SHEET OVER 1.1` on phones and `· DIALOG OVER 1.1` or `· POPOVER OVER 1.1` on wider screens. A desktop dialog and a phone sheet are different frames.
- **States are frames:** default, filled, validation error, loading, empty, couldn't load, success or result, processing or outcome unknown, view only or no permission, long names and amounts, and each persona that sees the screen differently. A state that changes layout on phones is drawn at 390 and 320.
- **One cast and dataset per file,** with long values drawn on purpose (long names, big amounts), so overflow is designed, not discovered.

## Saving canonical `.dc.html` files: use this exact sequence

Canonical designs are large native HTML assets (0.5–15 MB). Two facts decide how they are saved:

1. `copy_files` **inherits the source file's stored type.** Copying a `.txt` (or any file stored as `text/plain`) over a `.dc.html` asset leaves the asset stored as `text/plain`, and the canvas then shows literal `<!DOCTYPE html>` source instead of the design.
2. `run_script`'s `saveFile` sets `text/html` from the extension, but it **cannot write paths containing `·`**: it silently rewrites `·` to `-`. Names containing `,` fail too.

**Working sequence (do not deviate):**

1. Edit a working copy under `tmp/` with an `.html` extension through `run_script` → `saveFile` (for example `tmp/wP1.html`). A file written this way is stored as `text/html`.
2. Copy that file onto the canonical name: `copy_files [{ src: "tmp/wP1.html", dest: "P1 Payments.dc.html", asset: "" }]`.
3. Never `copy_files` a `.txt` working file onto a design, and never assume a `.html` extension alone fixes the stored type: a copy made *from* a `text/plain` asset is `text/plain`.
4. Delete the working copy once the canonical save is verified.

**Checking the stored type** (when a design shows as source code): write a small probe page in `tmp/` that `fetch()`es each asset and reads `r.headers.get('content-type')`, open it with `show_to_user`, read the result with `eval_js`, then delete the probe.

## Files

- **Names:** `<code> <title>.dc.html`, for example `P1 Payments.dc.html`. Use letters, digits, spaces and hyphens only. Never `·` or `,`: scripts here can't open such names.
- **Codes** group the product: a letter for the area and a number, with a letter for each further file in it. Halcyon uses `F0` vision, `F1` foundations, `F1a` motion, `F1b` themes, `F1c` emails, `F1d` the components page, `S1` app shell, then `P1`, `P1a`, `P2` for payments. Keep a file's code and name once created; handoffs and tools cite them.
- `tmp/` holds only the working copy being saved. `audit/` holds probes, QA pages and reports while a task runs; delete them when it ends, except `audit/LEDGER.md`. Never keep generator scripts that rebuild frames without the library.
- **After each coherent group of changes, check:** ids and `data-screen-label`s are unique, every `href="#…"` resolves, no element has two `style` attributes, and tags balance.

## Frames

- **A frame is one screen or state at one width.** It is an element with an `id` and a `data-screen-label`. Never put one frame inside another.
- **Widths:** draw each screen at 1440 (desktop), 1024 (tablet and small laptop), 390 (phone) and 320 (narrow phone). Draw every width a screen has; a missing width becomes a guess in the app.
- **Fixed-width frames carry the class `hx-screen`.** The library's narrower tiers then apply inside 1024, 390 and 320 frames on their own. A frame sized by its content (a specimen board, a note) never carries it: it would collapse.
- **Ids** are short, stable and unique in the file, for example `hx-p1-4-390`. A frame keeps its id when its content changes; a new variant of the same screen adds a suffix (`hx-p1-4-390-b`).
- **Labels** read `<number> <journey> · <screen> · <variant> · <width>`, for example `P1.4 Send · Recipient · name confirmed · 390`. Update the label when what the frame shows changes; keep the number.
- **A screen owned by another file** is a `ROUTE` frame that only points there.
- **Sample data** shows shape only: realistic invented names, amounts and dates, never real people's details.

## Components and tokens

The designs are built from one library that matches the app: `components/hx-tokens.css` (the app's tokens, under the app's names) and `components/hx.css` (the app's components, under the app's class names). `F1d Components linked to implementation` shows every component, variant and state at every width. Every product file links both stylesheets.

- **Draw parts from the library.** Look the component up in `F1d Components linked to implementation` and copy its whole part: inner elements, classes, marks and `data-state`. Give each part the classes the page shows (for example `hx-button hx-button-primary hx-button-form`) and its marks (`data-component="HxButton" data-component-variant="primary" data-component-size="form"`).
- **States use `data-state`:** `checked`, `on`, `off`, `disabled`, `error`. A frame showing two states of one form shows the same parts with different `data-state`.
- **Never restate in inline styles what the library sets:** type, colour, padding, border, corners and height. An inline override hides a drift the library would have caught.
- **Layout stays in the frame.** Positions, widths, gaps between parts and grids belong to the frame's own markup. Write them with tokens, such as `var(--hx-space-16)` or `var(--hx-text-muted)`, never literal values.
- **A part the library doesn't have** is drawn with tokens and marked `data-component="New"` with a short `data-component-name`, such as "Loyalty points card". List it in your handoff under "Needs a component". Don't invent a library name for it.
- **Never edit the library files or `F1d Components linked to implementation` by hand.** They change only through the implementation team's script packs, so the app and the designs change together.
- **Keep what's there.** Every part you keep keeps its classes, marks and `data-state`; every fixed-width frame keeps `hx-screen`.

## Emails

Frames labelled EMAIL, wherever they are, follow the email set in `F1c Email system`: presentation tables and inline styles, as email clients require. They take no library classes or marks, and script packs never touch them.

## Scripts

- Scripts here **cannot open names containing `·` or `,`**, and **a run stops after 30 seconds.** Copy files to plain names in `tmp/` with `copy_files` first, keep progress in a small JSON file in `tmp/`, and work in batches of about 8 seconds that resume.
- **When a prompt brings a script pack, the scripts do the work.** Don't open, print, quote, restyle or summarise a canonical file. Run the calls the prompt gives, in order, and report their one-line results.
- **Fingerprints decide.** If a script reports a mismatch, it has saved nothing: report the line and stop. Never correct a mismatch by hand.
- Record each prompt's result lines in `audit/LEDGER.md`: the date, the prompt and the lines. Read it first if a session restarts.

## Handoffs

- **Every handoff names the frames it changed, added and removed, by `id`,** with their labels, and the links it re-pointed.
- Write it as `HANDOFF-<topic>-<yyyy-mm-dd>.md` at the root: what changed, decisions applied, anything not done and why, and "Needs a component" for every `New` part.
- Tell the owner when you change canonical files between two prompts of a series: packs are built from the last export, and a file changed since is caught by its fingerprint.
