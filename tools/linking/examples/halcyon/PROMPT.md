# Prompt · Add the standing rules, and mark the payment badges and chosen speed

For Claude Design, in the Halcyon project (an invented example) · library series

The rules from the series brief still apply. Scripts do the work; do not open, print, restyle or summarise a canonical file. Fingerprints decide. Report the one-line results only.

**Attached:** `kit-link.js`, `kit-rules.js`, `kit-rules.json`, `kit-run.js` and `kit-remarks.json`. They should be in `uploads/`.

## Why

- `CLAUDE.md` has no "Components and tokens" section yet, so new frames aren't drawn from the library.
- In `P1 Payments`, the payment badges carry the library's classes but no marks, and the chosen speed (Standard) is drawn without its checked state.

## What this does

**1. Adds "Components and tokens" to the end of `CLAUDE.md`.** The full text is in `kit-rules.json`.

**2. Marks 5 parts in 1 file.**

| What the part is | Was | Now | Parts |
|---|---|---|---:|
| A payment or recipient badge | `hx-status-badge` classes, no mark | `HxStatusBadge`, tone `success` | 3 |
| The chosen speed | `HxRadio`, no state | `HxRadio`, `checked` | 2 |

- **Only the chosen speed looks different:** it now draws the library's checked ring. The badges draw exactly as before. Every element of the file was rendered here before and after: the two chosen radios changed their border and fill, and nothing moved or resized.
- **The email frame** (P1.9) is protected and untouched.
- **A file changed since the export** is changed only by proof, or left as it is and named under `failed`.

## Steps

Run R and B in one session, one after the other. If either stops, report the line and stop. Do not edit any file by hand.

**R. Add the standing rules.** Run:

```js
return await eval(await readFile('uploads/kit-rules.js'))({ readFile, saveFile })
```

Expect `ok: true` with `matchedExport: true`. Running it again does nothing (`already: true`).

**B. Mark the parts.**

1. Run:

   ```js
   return await eval(await readFile('uploads/kit-run.js'))({ readFile, saveFile, pack: 'kit-remarks.json', phase: 'prepare' })
   ```

   Then call `copy_files` with the returned list. It holds 1 entry.
2. Run with `phase: 'mark'`, and repeat until `remaining` is 0. Expect `saved: 1`, `already: []`, `markedByProof: []` and `failed: []`.
3. Run with `phase: 'finish'`. Then call `copy_files` with `copy_files_to_canonical`, then with `copy_files_for_check`.
4. Run with `phase: 'verify'`, and repeat until `remaining` is 0. Expect `verified: 1` and `wrong: []`.
5. Delete everything in `tmp/`.

Then add the ledger line and report the last line of each step.

## From now on

- **Badges** are `HxStatusBadge` with their tone (`success`, `neutral`).
- **A chosen option** carries `data-state="checked"`.
