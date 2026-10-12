<!--
Template: the prompt for the first journey in a new Claude Design project (and for any new journey after it). It asks
for a canvas of static frames, laid out as WORKFLOW.md section 3 describes, so the result can be reviewed, cited by
frame id and checked against the app. Send it after day 0, once the owner has approved the components page.
Written for Halcyon, an invented product (prefix hx); replace the journey, codes and names with your own. Fill every
<…>, then delete this comment and every "Guide:" line.
-->

# First journey · <journey name>

<d Month yyyy> · for Claude Design, in the Halcyon project · from the implementation team

Draw the <journey name> journey as a new design file, `<code> <title>.dc.html` (for example `P1 Payments.dc.html`). Read the project's `CLAUDE.md` or the attached copy before drawing, follow it throughout, and draw every part from the library and the components page. In a Design artifact, preserve the same frame IDs and component marks in the exported source; report any format limitation in the handoff.

## Draw a canvas, not an app

This file is a long canvas of static frames, not an app. Do not build routing, app state, JavaScript behaviour or one responsive page that resizes. Every screen, every state and every width is its own frame, drawn as it looks at that moment. A control that leads somewhere links to the next state's frame with `href="#<frame-id>"`, and every link must land on a frame in the file.

## The file

1. **Header:** eyebrow `HALCYON · <code>`, the title, a one-paragraph purpose, the principles below, the shared components and sizes that apply, the journey as numbered steps (each one line, naming the frames that show it), and the cast and sample data below.
2. **One section per step** (`<section>`, a column with a 28px gap): eyebrow (`1 · <STEP>`), `h2` title, and a note that is part of the spec: what the screen is for, its rules, what must never appear.
3. **One group per state** inside its section: a title and a short note, then one row (flex, no wrap, 28px gap, aligned to the top) with the same state at 1440, 1024, 390 and 320, left to right, each frame under a mono uppercase caption such as `1.1 <STEP> · <STATE> · 1440`.
4. **Frames:** `flex: none`, fixed width, minimum height 1440×900, 1024×900, 390×844, 320×568; the whole page, top to bottom; the class `hx-screen`; a unique `id` (`hx-<code>-<step>-<state>-<width>`) and a `data-screen-label`.
5. **Overlays** as their own frames over their page, at exactly the viewport height: dialogs and popovers at 1440 and 1024 (`· DIALOG OVER 1.1`), bottom sheets at 390 and 320 (`· SHEET OVER 1.1`).

## The journey

Guide: list the steps and, for each, the states to draw. Keep this list complete: a state that isn't drawn will be invented in the app.

| Step | What happens | States to draw |
|---|---|---|
| 1 <step> | <one line> | default, filled, validation error, loading, couldn't load |
| 2 <step> | <one line> | default, empty, long names and amounts, view only |
| 3 <step> | <one line> | review, processing, outcome unknown |
| 4 <step> | <one line> | success, failed, and each persona that sees it differently |

Draw every state at all four widths where its layout changes on phones; otherwise 1440 and 390 are enough, and the note says so.

## Principles

- <rule every screen in the file must respect, for example: the recipient's name is confirmed before any money moves>
- <for example: fees and the total are shown before the person confirms>

## Cast and sample data

- **People:** <Ada Example, the member sending; Ben Sample, the recipient; Bartholomew Example-Longfellow, the long name>.
- **Data:** <Main account $18,480.00; payment $1,250.00; reference HX-PAY-1042; the big amount $1,250,000.00>.

Use only these, in every frame, so the file tells one story.

## Report

Write `HANDOFF-<journey>-<yyyy-mm-dd>.md` at the root: the file, every frame id with its label, the links between frames, "Needs a component" for every `data-component="New"` part, and anything you could not draw, with the reason. Keep the report in the chat to ten lines or fewer.
