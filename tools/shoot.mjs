// Screenshots design frames whose id or label matches a regex.
//   node shoot.mjs <file> <regex> [out-dir]
// <file> is a design file's code (P1, P1a) or its full name. The export is read from DESIGN_DIR (else ./Design).
// Screenshots go to <out-dir>, by default <system temp>/design-frames.
//   MAX=n                   frames to shoot (default 6)
//   DESIGN_SCROLL_BOTTOM=1  also scroll frame-local scroll containers to their ends (files get a -bottom suffix)
//   DESIGN_STANDALONE=1     DESIGN_DIR is the export's standalone/ folder: open its bundled <code> <title>.html pages
//   PLAYWRIGHT_MODULE       where Playwright is (see lib/playwright.mjs)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { loadPlaywright } from './lib/playwright.mjs'

const env = (name) => process.env[name]
const [prefix, pattern, out = path.join(os.tmpdir(), 'design-frames')] = process.argv.slice(2)
if (!prefix || !pattern || prefix === '--help' || prefix === '-h') {
  console.log('usage: node shoot.mjs <file> <regex> [out-dir]   (see the comment at the top of shoot.mjs for settings)')
  process.exit(prefix === '--help' || prefix === '-h' ? 0 : 1)
}
const design = path.resolve(process.env.DESIGN_DIR || path.join(process.cwd(), 'Design'))
const suffix = env('DESIGN_STANDALONE') === '1' ? '.html' : '.dc.html'
// A file's code is its name up to the first space, middle dot, hyphen or underscore, as in design.py.
const code = (name) => name.slice(0, -suffix.length).split(/[ ·_-]/)[0]
const names = fs.readdirSync(design).filter((name) => name.endsWith(suffix) && (suffix === '.html' ? !name.endsWith('.dc.html') : true))
const exact = names.filter((name) => name === prefix)
const files = exact.length ? exact : names.filter((name) => code(name) === prefix)
if (files.length !== 1) {
  console.log(`${prefix} matches ${files.length} design files in ${design}`)
  process.exit(1)
}
const { chromium } = await loadPlaywright()
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } })
await page.goto(`file://${design}/${encodeURIComponent(files[0])}`, { waitUntil: 'load' })
await page.waitForTimeout(2500)
const match = new RegExp(pattern, 'i')
const bottom = env('DESIGN_SCROLL_BOTTOM') === '1'
let count = 0
for (const frame of await page.$$('[data-screen-label]')) {
  const label = (await frame.getAttribute('data-screen-label')) ?? ''
  const id = (await frame.getAttribute('id')) ?? ''
  if (!match.test(label) && !match.test(id)) continue
  const file = path.join(out, `${prefix}-${(id || label).replace(/[^\w.-]+/g, '_').slice(0, 80)}${bottom ? '-bottom' : ''}.png`)
  await frame.scrollIntoViewIfNeeded().catch(() => {})
  if (bottom) {
    await frame.evaluate((root) => {
      for (const element of [root, ...root.querySelectorAll('*')]) {
        const overflow = getComputedStyle(element).overflowY
        if (/auto|scroll/.test(overflow) && element.scrollHeight > element.clientHeight) {
          element.scrollTop = element.scrollHeight
        }
      }
    })
  }
  await frame.screenshot({ path: file }).catch((error) => console.log('failed', label, error.message.slice(0, 80)))
  console.log(`${file}  (${label})`)
  if (++count >= Number(process.env.MAX ?? 6)) break
}
if (!count) console.log('no frame matched')
await browser.close()
