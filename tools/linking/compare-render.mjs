// Renders each file before and after a change and compares every element in every frame: box, colours, type,
// borders, padding, corners, gaps and alignment (boxless elements are not counted as moved). Each difference is
// attributed to the marked part it belongs to (the element itself or its nearest marked ancestor), so a change can be
// traced to one pattern. Page scripts are off: the design runtime rewrites style attributes as it runs.
//   node compare-render.mjs <before dir> <after dir> <out.json> [--only <regex>]
// Both folders need the files' stylesheets (components/, _ds/) beside them. PLAYWRIGHT_MODULE: see ../lib/playwright.mjs.
import { readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { loadPlaywright } from '../lib/playwright.mjs'

const [beforeDir, afterDir, out] = process.argv.slice(2)
if (!beforeDir || !afterDir || !out) {
  console.log('usage: node compare-render.mjs <before dir> <after dir> <out.json> [--only <regex>]')
  process.exit(beforeDir === '--help' || beforeDir === '-h' ? 0 : 1)
}
const pw = await loadPlaywright()
const onlyIndex = process.argv.indexOf('--only')
const only = onlyIndex > 0 ? new RegExp(process.argv[onlyIndex + 1]) : null
const files = (await readdir(afterDir)).filter((f) => f.endsWith('.dc.html') && (!only || only.test(f))).sort()
const browser = await pw.chromium.launch()
const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1600, height: 1200 } })

const PROPS = ['color', 'backgroundColor', 'fontWeight', 'fontSize', 'lineHeight', 'fontFamily', 'letterSpacing', 'textTransform', 'whiteSpace', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'borderTopStyle', 'borderBottomStyle', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius', 'boxShadow', 'display', 'opacity', 'columnGap', 'rowGap', 'alignItems', 'justifyContent', 'flexDirection', 'flexWrap']
const measure = (page, withKeys) =>
  page.evaluate(
    ([props, withKeys]) => {
      const rows = []
      const keys = []
      const frames = []
      for (const frame of document.querySelectorAll('[data-screen-label]')) {
        const f = frame.getBoundingClientRect()
        const fw = f.width
        const tier = fw >= 1200 ? 'wide' : fw >= 768 ? 'tablet' : fw >= 360 ? 'phone' : 'narrow'
        for (const el of frame.querySelectorAll('*')) {
          if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue
          const cs = getComputedStyle(el)
          const r = el.getBoundingClientRect()
          const q = (n) => Math.round(n * 4) / 4
          rows.push(`${q(r.left - f.left)},${q(r.top - f.top)},${q(r.width)},${q(r.height)}\u0001${props.map((p) => cs[p]).join('\u0001')}`)
          if (withKeys) frames.push(frame.getAttribute('data-screen-label'))
          if (withKeys) {
            const marked = el.closest('[data-component]')
            if (!marked || !frame.contains(marked)) keys.push(null)
            else
              keys.push([
                `${marked.tagName.toLowerCase()}|${marked.getAttribute('class') ?? ''}|${marked.getAttribute('style') ?? ''}`,
                marked === el ? 1 : 0,
                [...marked.attributes].filter((a) => a.name.startsWith('data-component')).map((a) => `${a.name.replace('data-component', '').replace(/^-/, '') || 'component'}=${a.value}`).join(' '),
                tier,
                frame.getAttribute('data-screen-label'),
              ])
          }
        }
      }
      return { rows, keys, frames }
    },
    [PROPS, withKeys],
  )

const report = {}
for (const file of files) {
  const [a, b] = [await context.newPage(), await context.newPage()]
  await Promise.all([
    a.goto(`file://${path.resolve(beforeDir)}/${encodeURIComponent(file)}`, { waitUntil: 'load', timeout: 180000 }),
    b.goto(`file://${path.resolve(afterDir)}/${encodeURIComponent(file)}`, { waitUntil: 'load', timeout: 180000 }),
  ])
  // Animations would be sampled at different moments on the two pages; both are compared at rest.
  const still = '*,*::before,*::after{animation:none!important;transition:none!important}'
  const freeze = (page) => page.evaluate((css) => document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css })) && null, still)
  await Promise.all([freeze(a), freeze(b)])
  await Promise.all([a.waitForTimeout(1500), b.waitForTimeout(1500)])
  const [before, after] = await Promise.all([measure(a, true), measure(b, false)])
  await Promise.all([a.close(), b.close()])
  const entry = { elements: before.rows.length, mismatchedCount: before.rows.length !== after.rows.length, byKey: {}, unmarked: {}, rectOnly: 0, framesWithRect: [] }
  const rectFrames = new Set()
  // Per frame: elements that moved, parts whose own look changed, and marked parts whose size changed.
  const frameLog = {}
  const logFrame = (label) => (frameLog[label] ??= { moved: 0, changed: 0, resized: {} })
  for (let i = 0; i < Math.min(before.rows.length, after.rows.length); i++) {
    if (before.rows[i] === after.rows[i]) continue
    const [rb, ...pb] = before.rows[i].split('\u0001')
    const [ra, ...pa] = after.rows[i].split('\u0001')
    const changed = PROPS.map((p, k) => (pb[k] !== pa[k] ? `${p}: ${pb[k]} → ${pa[k]}` : null)).filter(Boolean)
    const key = before.keys[i]
    const label = before.frames[i]
    // An element without a box (display: contents, or empty) reports the frame's own offset, not a position of its own.
    const boxless = (r) => /,0,0$/.test(r)
    const moved = rb !== ra && !(boxless(rb) && boxless(ra))
    if (moved && key && key[1]) {
      const [, , wb, hb] = rb.split(','), [, , wa, ha] = ra.split(',')
      if (wb !== wa || hb !== ha) {
        const slot = (entry.byKey[key[0]] ??= { attrs: key[2], self: {}, inside: {} })
        slot.resized = slot.resized ?? {}
        slot.resized[key[3]] = (slot.resized[key[3]] ?? 0) + 1
      }
    }
    if (moved) {
      rectFrames.add(key ? key[4] : 'unmarked')
      logFrame(label).moved++
      const [, , wb, hb] = rb.split(','), [, , wa, ha] = ra.split(',')
      if (key && key[1] && (wb !== wa || hb !== ha)) logFrame(label).resized[key[2].split(' ')[0]] = true
    }
    if (changed.length) logFrame(label).changed++
    if (!changed.length) {
      if (moved) entry.rectOnly++
      continue
    }
    if (!key) {
      for (const c of changed) entry.unmarked[c] = (entry.unmarked[c] ?? 0) + 1
      continue
    }
    const [k, self, attrs, tier] = key
    const slot = (entry.byKey[k] ??= { attrs, self: {}, inside: {} })
    const bucket = self ? slot.self : slot.inside
    for (const c of changed) {
      const label = `${tier} ${c}`
      bucket[label] = (bucket[label] ?? 0) + 1
    }
  }
  entry.frames = Object.fromEntries(Object.entries(frameLog).map(([k, v]) => [k, { ...v, resized: Object.keys(v.resized) }]))
  entry.framesWithRect = [...rectFrames].slice(0, 20)
  entry.framesWithRectCount = rectFrames.size
  report[file] = entry
  console.log(`${file.split(' ')[0]}: ${entry.elements} elements, ${Object.keys(entry.byKey).length} patterns changed, unmarked ${Object.keys(entry.unmarked).length}, rect-only ${entry.rectOnly}, frames with movement ${rectFrames.size}`)
}
await browser.close()
await writeFile(out, JSON.stringify(report, null, 1))
// One line for the whole run: elements compared, elements whose look or box changed, and marked parts resized.
const totals = Object.values(report).reduce(
  (t, e) => ({
    files: t.files + 1,
    elements: t.elements + e.elements,
    countMismatch: t.countMismatch + (e.mismatchedCount ? 1 : 0),
    changedPatterns: t.changedPatterns + Object.keys(e.byKey).length,
    unmarkedChanges: t.unmarkedChanges + Object.values(e.unmarked).reduce((n, v) => n + v, 0),
    movedOnly: t.movedOnly + e.rectOnly,
    framesChanged: t.framesChanged + Object.keys(e.frames).length,
    resizedParts: t.resizedParts + Object.values(e.byKey).reduce((n, k) => n + Object.values(k.resized ?? {}).reduce((a, b) => a + b, 0), 0),
  }),
  { files: 0, elements: 0, countMismatch: 0, changedPatterns: 0, unmarkedChanges: 0, movedOnly: 0, framesChanged: 0, resizedParts: 0 },
)
console.log(JSON.stringify(totals))
