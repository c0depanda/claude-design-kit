<!--
Template: a brief that asks Claude Design to change designs (new states, decisions, copy, flows).
Save it in the code project's work folder as HANDOFF-<topic>-<yyyy-mm-dd>.md, never inside the design export, which the
next export replaces. The owner pastes or uploads it into the Claude Design project.
Examples use Halcyon, an invented product (class prefix hx, components page F1d); use your own names.
For bulk, mechanical changes across many frames, don't use this: build a script pack and use claude-design-prompt.md.
Delete this comment and every "Guide:" line before sending.
-->

# Handoff · <topic> · <d Month yyyy>

<One or two sentences: what this pass does and why. Name the decisions it applies.>

**Every decision below is final.** Do not reopen one. If a decision conflicts with a frame this brief does not list, follow the decision, change that frame too, and list it in the closeout.

## How to work

- **Saving:** follow `CLAUDE.md` exactly: a working copy in `tmp/` saved as `.html`, then `copy_files` onto the canonical name.
- **Scope:** change only what is listed here. Every other frame stays as it is.
- **Components:** draw every part from the library, as `CLAUDE.md` says: classes and marks from `F1d Components linked to implementation`, layout with tokens, no inline restatement of library styles. A part the library lacks is `data-component="New"` with a name, listed under "Needs a component".
- **Widths:** where a frame exists at 1440, 1024, 390 and 320, change every width. Where this brief says a width is missing, draw it.
- **New frames:** build each from the existing frame named as its pattern. Give it the next free number in its section, a unique `id`, a `data-screen-label` in the file's style and, at a fixed width, the class `hx-screen`. When a change alters what a frame shows, update its label but keep its number and id.
- **Canvas:** new frames follow `CLAUDE.md`'s canvas layout: each state in its group's row, under its caption, with overlays as their own frames. Never an interactive prototype.
- **Copy:** text in quotes is final wording. UK English, sentence case, the ellipsis character (…). Say a status once; never explain internal behaviour to customers.
- **Removing frames:** delete them, then re-point every `href="#…"` that led to them, so each flow still links end to end.
- **After each item, check:** ids and labels are unique, every `href="#…"` resolves, no `style` attribute is duplicated, and tags balance.

## Keep the layout continuous

Guide: list the container contract of each family this brief touches, so a page doesn't shift as a journey moves on. Measure it from the existing frames (design.py text and shoot.mjs) and give numbers.

| Family | Items here | Container (1440 / 1024 / 390 / 320) | Navigation |
| --- | --- | --- | --- |
| <e.g. Payment pages: P1, P2> | 2, 4 | <28 / 20 / 16 / 14> | <Title at 133 without a breadcrumb, 173 with one> |

- Modals, drawers, sheets and popovers keep their placement.
- **Before saving each file,** measure every new or changed frame against the frame before it in its flow: its content's left edge and the top of its title, in px from the frame edge. They must match the family's numbers. Put the measurements in the closeout.

**Suggested order:** wording-only items first, then flow items, then new states.

---

## 1 · <item title> (<file codes>)

**Decision:**
- <what the owner decided, in one line each>

**Change:**
- **<file> <frame number or id>** (<which widths>): <exact change>. Text in quotes is final.

**Draw:** Guide: for each new frame, its title, body, fields, buttons and the existing frame to copy.
1. **"<title>"**: <fields and copy>. Pattern: <existing frame id>.

**Links:**
- "<control>" on <frame> opens <frame>.

**Also fix:**
- <small inconsistencies found while checking, with frame ids>

## 2 · <item title>

…

---

## Closeout

Write `HANDOFF-<topic>-closeout-<yyyy-mm-dd>.md` at the project root. For each item list:

- the frames changed, added (with ids and labels) and removed;
- the links re-pointed;
- the layout measurements;
- "Needs a component": every `data-component="New"` part, with its name and frames;
- anything not done, and why.
