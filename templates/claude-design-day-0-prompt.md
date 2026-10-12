<!--
Template: the first prompt in a new Claude Design project. It sets up the authoring notes, the component library and
the components page before any screen is drawn, so no screen is ever drawn with inline styles.
Pick route A (the app, or its design system, already exists in code) or route B (new product). Fill the <…>, delete
the other route, this comment and every "Guide:" line, and attach the files it names.
It is written for Halcyon, an invented product whose class prefix is "hx": replace hx-, Hx, the file codes and the
product name with your own.
-->

# Day 0 · Set up the project before drawing any screen

<d Month yyyy> · for Claude Design, in the Halcyon project · from the implementation team

This project's designs are built into a real app. Before any screen is drawn, the project needs three things: the authoring notes, one component library that matches the app, and a page that shows every component. Every screen is then drawn from that library, so a redesign changes the library once instead of every frame.

## 1. Save the authoring notes

Read the attached `CLAUDE.md` in full: it is how every design session here works. Save it at the project root where supported; for a Design artifact, the owner also keeps a copy to supply in future conversations. Before running the file or script steps below, confirm the required tools are available; report any missing capability and leave those steps unapplied. In short:

- **a design file is a canvas of static frames, never an app:** no routing, no app state, no JavaScript behaviour, no single responsive page. Every screen, state and width is its own frame, and interaction is a link (`href="#<frame-id>"`) to the next state's frame;
- canonical files are saved through a working copy in `tmp/` and `copy_files`;
- file names use plain characters (no `·` or `,`);
- frames are drawn at 1440, 1024, 390 and 320, each with a unique `id`, a `data-screen-label` and, at a fixed width, the class `hx-screen`;
- parts are drawn with the library's classes and marked `data-component`, with `data-state` for states; layout uses tokens;
- emails are a separate inline-styled set.

## 2. Install the library

**Route A: the app exists.** Guide: build `hx-tokens.css` from the app's token source (its names and values) and `hx.css` from the app's components (its class names, one rule per variant and size, inner parts included), then pack them with `tools/linking/build-library-pack.mjs` and attach the pack.

**Attached:** `kit-link.js`, `kit-install.js` and `kit-library.json`. They should be in `uploads/`.

1. Run:

   ```js
   return await eval(await readFile('uploads/kit-install.js'))({ readFile, saveFile, phase: 'save' })
   ```

   Expect `ok: true`.
2. If the result includes `copy_files_to_canonical`, run those `copy_files` calls in order, preserving `asset: ""`. Then run the returned `copy_files_for_check` calls. These install the packed components page and prepare its verification copy.
3. Run the same script call with `phase: 'verify'`. Expect `ok: true`. Delete only the working/check files named in its returned `delete` list after verification succeeds.
4. Report both result lines. Do not open or edit the library files: they mirror the app, and they change only through packs from the implementation team.

**Route B: a new product.** Draw the foundations first, then write the library from them.

1. In `F1 Foundations`, draw the tokens: colours (light and dark), type scale, spacing, corners, borders, elevation and motion, each with its name `--hx-<group>-<name>`.
2. Write `components/hx-tokens.css` with those tokens as CSS custom properties (light under `:root`, dark under `[data-theme="dark"]`).
3. Write `components/hx.css` with one rule per component, variant and size, named as the app will name them: class `hx-button`, variant `hx-button-primary`, size `hx-button-md`; component `HxButton`. Include inner parts (a radio's ring, a switch's thumb, a select's chevron, a dialog's header, body and footer) and states (`[data-state="checked"]`, `[data-state="error"]`, `[data-state="disabled"]`). Use only tokens.
4. Add the screen container and the width tiers:

   ```css
   .hx-screen { container: hx-screen / inline-size; }
   @container hx-screen (width < 1200px) { /* tablet values */ }
   @container hx-screen (width < 700px) { /* phone values */ }
   @container hx-screen (width < 355px) { /* narrow phone values */ }
   ```

5. List in your handoff every component, variant and state you wrote. The owner approves the list, and from then on the library changes only through the implementation team's packs.

Guide: templates/library/ in the kit holds a starting skeleton for both files.

## 3. Draw the components page

If route A's pack already installed `F1d Components linked to implementation.dc.html`, review that page against the requirements below and report gaps without redrawing it; the implementation team supplies corrections through a pack. Otherwise, create it:

- **One frame per component and width:** `HxButton · 1440`, `· 1024`, `· 390`, `· 320`, each with an `id` such as `hx-f1d-button-390` and, being fixed-width, the class `hx-screen`.
- **Inside each frame, every variant and state side by side:** default and error, enabled and disabled, unchecked and checked, off and on. Caption each specimen with its variant and state.
- **Each specimen is the whole part,** with its inner elements, drawn only with library classes, marks (`data-component`, `data-component-variant`, `data-component-size`, …) and `data-state`. No inline styles except layout between specimens.
- **Each specimen sits as it would on a page:** at its page gutter, inside the card, sheet or panel it normally lives in, on the page colour behind it.
- **A section note at the top** says what the page is for: the one place to look a component up before drawing it.

## 4. Set up the other foundation files

- `F1a Motion and interaction`, `F1b Light and dark themes` and `F1c Email system and templates`. `F1c` holds the email anatomy (presentation tables, inline styles, a fallback font stack, one action, a footer), which every email frame follows.
- `S1 App shell and navigation`: the shell at every width (desktop navigation, phone header and bottom navigation), drawn from the library's shell components (for example `HxPageHeader`, `HxBottomNav`).

Draw every foundation file as a canvas, as `CLAUDE.md` describes: the file header, then sections with captioned frames.

## 5. Stop before the first journey

Don't draw any feature screen yet. The first journey comes as its own prompt, once the owner has reviewed the components page, so the canvas layout is checked on one journey before it is repeated.

## 6. Report

Report in ten lines or fewer: the result lines of step 2 (route A) or the component list (route B), the files created with their frame counts, and anything you could not do. Write the handoff as `HANDOFF-day-0-<yyyy-mm-dd>.md` at the root.
