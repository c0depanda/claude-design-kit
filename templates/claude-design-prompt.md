<!--
Template: a prompt that has Claude Design run a script pack (marks, restyles, library or components page updates).
Modelled on the prompts that ran cleanly on an earlier project. Examples use Halcyon, an invented product (prefix hx).
Save it in the code project's work folder as HANDOFF-<series>-prompt-<n>-<yyyy-mm-dd>.md, next to its pack.
Part 1 goes once, at the start of a series (or whenever a new session starts). Part 2 is one prompt.
Fill every <…> with numbers from your local run (build-pack.mjs, run-pack-local.mjs, compare-render.mjs).
Delete this comment and every "Guide:" line before sending.
-->

# Part 1 · Series rules (send once)

# Handoff · <series title>, run by scripts

<d Month yyyy> · for Claude Design, in the <product> project · from the implementation team

This is a series of short prompts. Each comes with an upload pack of scripts and runs on its own. This message holds the rules for the whole series. The owner posts each prompt when its pack is ready.

Before starting, confirm this session provides `run_script`, `readFile`, `saveFile`, and `copy_files` with the file access these steps require. This applies equally in a Design artifact. If any capability is missing, report it and leave the pack unapplied.

## Why

<Two or three bullets: what is wrong across the files, with counts, and what the series changes. Say whether looks change.>

## How every prompt in this series works

1. **Scripts do the work.** Do not open, print, quote or summarise a canonical design file. Do not take screenshots or previews unless a prompt asks for them. Your context should hold only the one-line results the scripts return. The files total <n> MB; reading them would use the quota many times over.
2. **Fingerprints decide.** Before a prompt reaches you, its scripts ran on the owner's export of this project, and every frame they changed was rendered and compared there. Each script prints SHA-256 fingerprints.
   - If they match the expected values, your result is byte for byte the one that was verified.
   - If they don't, the script stops before saving anything. Report its line and stop. Never correct a mismatch by hand.
3. **Saving** follows `CLAUDE.md` exactly: `run_script` → `saveFile` to `tmp/<name>.html`, then `copy_files` onto the canonical name, then delete the working copy.
   - Scripts here cannot open names containing `·` or `,`, and a run stops after 30 seconds.
   - So every pack works on plain-named copies that `copy_files` makes, and resumes across runs.
4. **Ledger.** Add one line per prompt to `audit/LEDGER.md`: the date, the prompt number and the result lines. Read it first if a session restarts.
5. **Report** in ten lines or fewer: the result lines, what you deleted or saved, and anything you could not do, with the reason.

## Changes between prompts

Each pack is built from the owner's latest export. A file you change between prompts is caught by its fingerprint: it is then changed only by proof (nothing but the listed parts changes) or left as it is and named under `failed`. Tell the owner when you change canonical files between prompts.

---

# Part 2 · One prompt

# Prompt <n> · <what it does, in a few words>

<d Month yyyy> · for Claude Design, in the <product> project · <series name>

The rules from the series brief still apply. Scripts do the work; do not open, print, restyle or summarise a canonical file or the components page (`F1d`). Fingerprints decide. Report the one-line results only.

**Attached:** `kit-link.js` and `kit-run.js` (<the same as Prompt n−1's | newer; replace them>), `kit-install.js` (<if the library changes>), `kit-library.json` (<library vN and the components page vN>) and `kit-remarks.json` (new). They should be in `uploads/`; replace the earlier copies.

## Why

- <what is wrong now, with counts and an example the designer can picture>
- <the owner's decision this applies, if any>

## What this does

**1. <Corrects | labels | restyles> <n> parts in <n> files.**

| What the part is | Was | Now | Parts |
|---|---|---|---:|
| <e.g. A checked radio> | <radio, without its state> | <`HxRadio`, `checked`> | <2,250> |

- **Nothing else looks different.** Every frame of the <n> files (<n> elements) was rendered here before and after, element by element: box, colours, type, borders, padding, corners, gaps and alignment. <0 unintended changes.>
  Guide: if looks change on purpose, say "Only the decided changes" and list them, with "the layout around them moved or resized, boxes only".
- **A file changed since the export** is corrected only by proof: every listed part is found exactly as often as verified, look-alikes are told apart by the text after them, and nothing but marks, class, style and `data-state` changes on the listed parts. Otherwise the file is left as it is and named under `failed`.
- **Left as they are:** <groups not changed, and why: waiting on the owner, need new parts, protected frames>.

**2. Library <vN>:** <unchanged | n rules become m; name each new rule and what it draws>. Every rule a frame already uses draws exactly as before.

**3. <Components page> <vN>:** <n frames, n components, n specimens; what it adds>.

**Checked here:**

- <n of n specimens match their source in place, pixel for pixel apart from anti-aliasing; the others and why>.
- <property checks: n part and n inner-part properties, 0 differences>.

## Steps

Run A and B in one session, one after the other. If either stops, report the line and stop. Do not edit any file by hand.

Guide: drop A when the library doesn't change.

**A. Install the library and the components page.**

1. Run:

   ```js
   return await eval(await readFile('uploads/kit-install.js'))({ readFile, saveFile, phase: 'save' })
   ```

   Expect `ok: true`, with every `saved` entry `true`.
2. Call `copy_files` with `copy_files_to_canonical`, then with `copy_files_for_check`, each list exactly as returned.
3. Run the same call with `phase: 'verify'`. Expect `ok: true`.
4. Delete the paths in `delete`.

**B. <Correct | label | restyle> the parts.**

1. Run:

   ```js
   return await eval(await readFile('uploads/kit-run.js'))({ readFile, saveFile, pack: 'kit-remarks.json', phase: 'prepare' })
   ```

   Then call `copy_files` with the returned list. It holds <n> entries.
2. Run with `phase: 'mark'`, and repeat until `remaining` is 0. Expect `saved: <n>`, `markedByProof: []` and `failed: []`.
   - A file you changed since the export appears under `markedByProof` with its length. That is fine.
   - A file named under `failed` stays exactly as it was. Name it in your report.
3. Run with `phase: 'finish'`. Then call `copy_files` with `copy_files_to_canonical`, then with `copy_files_for_check`.
4. Run with `phase: 'verify'`, and repeat until `remaining` is 0. Expect `verified: <n>` and `wrong: []`.
5. Delete everything in `tmp/`.

Then add the ledger line and report:

- the last line of each phase;
- the number of mark and verify runs.

## From now on

Guide: the standing rules this prompt adds, short and concrete. They are what keeps the next redesign from drifting again.

- **<Component>:** <how to draw and label it, with sizes and tokens>.
- **Leave alone until the owner decides:** <list>.
