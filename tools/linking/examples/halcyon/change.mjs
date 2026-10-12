// The scripted change this example's pack carries: mark the recipient and payment badges as HxStatusBadge, and give
// the chosen speed (Standard) its checked state. A change is always a script, so it can be rerun on a fresh export.
//   node change.mjs <copy of the design folder>
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const file = path.join(process.argv[2], 'P1 Payments.dc.html')
let text = await readFile(file, 'utf8')
text = text.replaceAll(
  '<span class="hx-status-badge hx-status-badge-success"',
  '<span class="hx-status-badge hx-status-badge-success" data-component="HxStatusBadge" data-component-tone="success"',
)
text = text.replaceAll(
  '<span class="hx-radio" data-component="HxRadio"></span> Standard',
  '<span class="hx-radio" data-component="HxRadio" data-state="checked"></span> Standard',
)
await writeFile(file, text)
