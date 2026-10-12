// Design contract check: compares each mapped Claude Design frame with the app page that implements it.
//   node check.mjs [map.json] [--only <regex>] [--app <url>] [--design <dir>] [--jobs 6] [--refresh] [--specs-only]
//                  [--tolerance 2] [--out <dir>]
// The map defaults to ./frame-routes.json. Specs (specs/), reports (reports/<time>/) and accepted.json live next to
// the map. Frame specs are read from the design export once and cached as small JSON; --refresh reads them again
// after a new export is installed. The report lists, per frame: copy missing or extra, content offset, positions,
// type, colour and panel boxes that differ beyond the tolerance.
//
// Settings (environment variables; tools/env.example shows an example for each):
//   DESIGN_DIR           the Claude Design export (also --design; else ./Design)
//   APP_URL              required: the running app (also --app)
//   REFERENCE_PREFIXES   required: comma-separated prefixes of record references, treated as data (for example HX);
//                        set it empty if records have none
//   PLAYWRIGHT_MODULE    where Playwright is (see ../lib/playwright.mjs)
//   AUTH_MODULE          a module exporting openSession(browser, { app, account, ...contextOptions }) → { context,
//                        page } for frames with an "account", and optionally applyScenario(page, { app, scenario })
//   STORAGE_STATE_DIR    without AUTH_MODULE: Playwright storage states named <account>.json
//   SCENARIO_ENDPOINT    required when a frame has a scenario and there is no applyScenario: POST { scenarioId } here
//   SCENARIO_HEADERS     required with SCENARIO_ENDPOINT: JSON headers for that POST (origin is always sent)
//   SHELL_LABELS         comma-separated navigation labels of the app shell, left out of both sides (default none)
//   PHONE_HEADER_HEIGHT  phone header height in px, left out below 768 wide (default 0)
//   COMPONENT_PREFIX     class prefix of design-system parts (default hx); PART_PREFIXES lists every prefix to
//                        count as a part (default the component prefix)
//   UTILITY_PATTERN      a regex for classes that carry the prefix but aren't parts (default none)
//   THEME_ATTRIBUTE      attribute=value set on <html> before measuring, because designs are drawn in one theme
//                        (default data-theme=light; empty to skip)
//   HIDE_SELECTORS       comma-separated selectors hidden on the app before measuring, such as a dev server's
//                        floating tools (default none)
//   LOCALE               browser locale (default en-GB)
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { extractScreen } from './extract.mjs'
import { loadPlaywright } from '../lib/playwright.mjs'

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  const text = fs.readFileSync(new URL(import.meta.url), 'utf8')
  console.log(text.slice(0, text.indexOf('\nimport ')).replace(/^\/\/ ?/gm, ''))
  process.exit(0)
}
const flag = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : fallback
}
const env = (name, fallback) => (process.env[name] === undefined ? fallback : process.env[name])
const mapFile = path.resolve(args.find((a) => a.endsWith('.json')) ?? 'frame-routes.json')
if (!fs.existsSync(mapFile)) {
  console.error(`No frame map at ${mapFile}. Give one (node check.mjs <map.json>) or run from the folder that holds frame-routes.json.`)
  process.exit(1)
}
const here = path.dirname(mapFile)
const app = flag('--app', env('APP_URL', ''))
const designRoot = path.resolve(flag('--design', env('DESIGN_DIR', '') || path.join(process.cwd(), 'Design')))
const jobs = Number(flag('--jobs', '6'))
const only = flag('--only', null)
const outDir = flag('--out', path.join(here, 'reports', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')))
const refresh = args.includes('--refresh')
const TOL = Number(flag('--tolerance', '2'))
const list = (value) => value.split(',').map((s) => s.trim()).filter(Boolean)
const SHELL = list(env('SHELL_LABELS', ''))
const PHONE_HEADER = Number(env('PHONE_HEADER_HEIGHT', '0'))
const PREFIX = env('COMPONENT_PREFIX', 'hx')
const PARTS = list(env('PART_PREFIXES', PREFIX))
const patterns = { partPattern: `^(${PARTS.join('|')})-[a-z]`, utilityPattern: env('UTILITY_PATTERN', '') || null }
const [themeName, themeValue] = env('THEME_ATTRIBUTE', 'data-theme=light').split('=')
const HIDE = list(env('HIDE_SELECTORS', ''))
const LOCALE = env('LOCALE', 'en-GB')
const specsOnly = args.includes('--specs-only')
// Settings with no sensible default: stop before any work rather than compare with a wrong guess.
const missing = []
if (!specsOnly && !app) missing.push('APP_URL (or --app): the running app, for example http://localhost:3000')
if (!specsOnly && process.env.REFERENCE_PREFIXES === undefined)
  missing.push('REFERENCE_PREFIXES: prefixes of record references such as HX-PAY-1042, for example HX (empty if none)')
const REFS = list(env('REFERENCE_PREFIXES', ''))

const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'))
const acceptedFile = path.join(here, 'accepted.json')
const allow = fs.existsSync(acceptedFile) ? JSON.parse(fs.readFileSync(acceptedFile, 'utf8')) : []
const entries = map.frames.filter((e) => !only || new RegExp(only).test(e.frame) || new RegExp(only).test(e.route))
const auth = process.env.AUTH_MODULE ? await import(pathToFileURL(path.resolve(process.env.AUTH_MODULE)).href) : null
if (!specsOnly && entries.some((e) => e.scenario) && !auth?.applyScenario) {
  if (process.env.SCENARIO_ENDPOINT === undefined) missing.push('SCENARIO_ENDPOINT: where a scenario is applied, for example /api/review/scenario')
  if (process.env.SCENARIO_HEADERS === undefined) missing.push('SCENARIO_HEADERS: JSON headers for that request, for example {"x-hx-request":"1"} ({} for none)')
}
if (missing.length) {
  console.error(`Set these first (see tools/env.example):\n  ${missing.join('\n  ')}`)
  process.exit(1)
}
const specDir = path.join(here, 'specs')
fs.mkdirSync(specDir, { recursive: true })
fs.mkdirSync(outDir, { recursive: true })

const { chromium } = await loadPlaywright()
if (!specsOnly && !auth && !process.env.STORAGE_STATE_DIR && entries.some((e) => e.account))
  console.log('Note: no AUTH_MODULE or STORAGE_STATE_DIR, so pages open signed out.')
const browser = await chromium.launch()

// 1. Design specs, one page per design file, cached.
const code = (name) => name.slice(0, -'.dc.html'.length).split(/[ ·_-]/)[0]
const byFile = new Map()
for (const e of entries) {
  const spec = path.join(specDir, `${e.frame}.json`)
  if (!refresh && fs.existsSync(spec)) continue
  if (!byFile.has(e.file)) byFile.set(e.file, [])
  byFile.get(e.file).push(e)
}
for (const [file, list] of byFile) {
  const name = fs.readdirSync(designRoot).find((n) => n.endsWith('.dc.html') && (n === file || code(n) === file))
  if (!name) throw new Error(`no design file for ${file} in ${designRoot}`)
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } })
  await page.goto(`file://${designRoot}/${encodeURIComponent(name)}`, { waitUntil: 'load' })
  await page.waitForTimeout(2500)
  for (const e of list) {
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView(), e.frame)
    const spec = await page.evaluate(extractScreen, { rootId: e.frame, shellLabels: SHELL, ...patterns })
    if (!spec) {
      console.log(`missing frame ${e.frame} in ${name}`)
      continue
    }
    spec.label = await page.evaluate((id) => document.getElementById(id)?.getAttribute('data-screen-label') ?? '', e.frame)
    fs.writeFileSync(path.join(specDir, `${e.frame}.json`), JSON.stringify(spec))
  }
  await page.close()
}

if (specsOnly) {
  await browser.close()
  console.log(`specs in ${specDir}`)
  process.exit(0)
}

// 2. Compare.
const norm = (s) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\.\.\./g, '…').replace(/\s+/g, ' ').trim()
// Kinds of data that differ between the design's sample people and the app's accounts: matched by kind and place.
const DYNAMIC = [
  // Money: a currency symbol or a three-letter currency code before the figure, or a code after a figure in cents.
  /\p{Sc}\s?\d[\d,]*(\.\d+)?|\b[A-Z]{3}\s?\d[\d,]*(\.\d+)?\b|\d[\d,]*\.\d{2}\s?[A-Z]{3,5}\b/u,
  /\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}\b|\btoday\b|\byesterday\b|\b\d+ (days?|hours?|minutes?) ago\b/i,
  /\b\d{1,2}:\d{2}\b/,
  REFS.length ? new RegExp(`\\b[A-Z]{2,5}-[A-Z0-9]{1,4}-?\\d{3,}\\b|\\b(${REFS.join('|')})[ -]?\\d{4,}\\b`) : /\b[A-Z]{2,5}-[A-Z0-9]{1,4}-?\d{3,}\b/,
  /[\w.+-]+@[\w-]+\.[\w.]+/,
  /\+?\d[\d\s]{7,}\d/,
  /··\s?\d{3,4}|\b\d{6,}\b/,
]
const dynamic = (t) => DYNAMIC.some((re) => re.test(t))
function content(screen) {
  const top = Math.max(screen.shellBottom, screen.width < 768 ? PHONE_HEADER : 0)
  return screen.texts.filter(
    (t) => t.y >= top && !(SHELL.includes(t.text) && t.y > screen.height * 0.5) && !/^\d+\s?ms$|^ms$/.test(t.text),
  )
}
function compare(entry, spec, actual) {
  const findings = []
  const want = content(spec), got = content(actual)
  const used = new Set(), pairs = [], unmatched = []
  for (const d of want) {
    const key = norm(d.text)
    let best = null
    for (const [i, a] of got.entries()) {
      if (used.has(i) || norm(a.text) !== key) continue
      const cost = Math.abs(a.y - d.y) + 0.5 * Math.abs(a.x - d.x)
      if (!best || cost < best.cost) best = { i, cost }
    }
    if (!best && dynamic(d.text)) {
      for (const [i, a] of got.entries()) {
        if (used.has(i) || !dynamic(a.text) || Math.abs(a.y - d.y) > 80) continue
        const cost = Math.abs(a.y - d.y) + 0.5 * Math.abs(a.x - d.x)
        if (!best || cost < best.cost) best = { i, cost, data: true }
      }
    }
    if (best) {
      used.add(best.i)
      pairs.push({ d, a: got[best.i], data: !!best.data })
    } else unmatched.push(d)
  }
  const extra = got.filter((a, i) => !used.has(i) && !dynamic(a.text))
  // Copy that differs in the same place reads as one finding: what the design says and what the app says.
  for (const d of unmatched) {
    const j = extra.findIndex((a) => Math.abs(a.y - d.y) < 24 && Math.abs(a.x - d.x) < 40)
    if (j >= 0) {
      findings.push({ kind: 'copy-different', text: d.text, detail: `app says "${extra[j].text}"` })
      extra.splice(j, 1)
    } else findings.push({ kind: 'copy-missing', text: d.text, at: `${d.x},${d.y}` })
  }
  for (const a of extra) findings.push({ kind: 'copy-extra', text: a.text, at: `${a.x},${a.y}` })

  // Anchor on the page title: where it sits against the frame is reported once, and the rest is measured from it.
  const title = pairs.filter((p) => parseFloat(p.d.size) >= 20).sort((x, y) => x.d.y - y.d.y)[0]
  const ax = title ? title.a.x - title.d.x : 0, ay = title ? title.a.y - title.d.y : 0
  if (title && (Math.abs(ax) > TOL || Math.abs(ay) > TOL))
    findings.push({ kind: 'title-offset', text: title.d.text, detail: `title sits ${ax > 0 ? '+' : ''}${ax} across, ${ay > 0 ? '+' : ''}${ay} down from the frame (frame ${title.d.x},${title.d.y} · app ${title.a.x},${title.a.y})` })

  // Panels: the design box and the app box that hold the same texts, placed from the title, sized absolutely.
  const panelMap = new Map()
  for (const p of pairs) {
    if (p.d.panel === null || p.a.panel === null) continue
    if (!panelMap.has(p.d.panel)) panelMap.set(p.d.panel, new Map())
    const m = panelMap.get(p.d.panel)
    m.set(p.a.panel, (m.get(p.a.panel) ?? 0) + 1)
  }
  const appPanelOf = new Map()
  for (const [dp, m] of panelMap) appPanelOf.set(dp, [...m.entries()].sort((x, y) => y[1] - x[1])[0][0])
  for (const [dp, ap] of appPanelOf) {
    const D = spec.boxes[dp], A = actual.boxes[ap]
    if (!D || !A || D.y < spec.shellBottom) continue
    const diffs = []
    if (Math.abs(A.x - D.x - ax) > TOL) diffs.push(`x ${D.x}→${A.x}`)
    if (Math.abs(A.y - D.y - ay) > TOL) diffs.push(`top ${D.y}→${A.y}`)
    if (Math.abs(A.w - D.w) > TOL) diffs.push(`width ${D.w}→${A.w}`)
    if (Math.abs(A.h - D.h) > 3) diffs.push(`height ${D.h}→${A.h} (${A.h - D.h > 0 ? '+' : ''}${A.h - D.h})`)
    if (D.radius !== A.radius) diffs.push(`radius ${D.radius}→${A.radius}`)
    if (diffs.length) {
      const first = pairs.find((p) => p.d.panel === dp)?.d.text ?? ''
      findings.push({ kind: 'panel', text: first.slice(0, 40), detail: diffs.join(', ') })
    }
  }

  // Positions: inside a panel from the panel's corner, otherwise from the title. Only where the spacing first
  // changes is reported, so one taller row is one finding, not one per row below it.
  const groups = new Map()
  for (const p of pairs) {
    const ap = p.d.panel !== null ? appPanelOf.get(p.d.panel) : undefined
    const D = ap !== undefined ? spec.boxes[p.d.panel] : null, A = ap !== undefined ? actual.boxes[ap] : null
    const inside = D && A && p.a.panel === ap
    const key = inside ? `p${p.d.panel}` : 'page'
    const dx = inside ? p.a.x - A.x - (p.d.x - D.x) : p.a.x - p.d.x - ax
    const dy = inside ? p.a.y - A.y - (p.d.y - D.y) : p.a.y - p.d.y - ay
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push({ ...p, dx, dy })
  }
  for (const list of groups.values()) {
    list.sort((x, y) => x.d.y - y.d.y || x.d.x - y.d.x)
    let prevY = 0
    for (const p of list) {
      if (Math.abs(p.dx) > TOL) findings.push({ kind: 'position', text: p.d.text, detail: `${p.dx > 0 ? '+' : ''}${p.dx} across (frame ${p.d.x} · app ${p.a.x})` })
      if (Math.abs(p.dy - prevY) > TOL) findings.push({ kind: 'spacing', text: p.d.text, detail: `${p.dy - prevY > 0 ? '+' : ''}${p.dy - prevY} down from what comes before it (frame ${p.d.y} · app ${p.a.y})` })
      prevY = p.dy
    }
  }

  for (const { d, a, data } of pairs) {
    const type = []
    if (d.size !== a.size) type.push(`size ${d.size}→${a.size}`)
    if (d.line !== a.line && d.line !== 'normal' && a.line !== 'normal') type.push(`line ${d.line}→${a.line}`)
    if (d.weight !== a.weight) type.push(`weight ${d.weight}→${a.weight}`)
    if (type.length) findings.push({ kind: 'type', text: d.text, detail: type.join(', '), part: a.part })
    if (d.color !== a.color) findings.push({ kind: 'colour', text: d.text, detail: `${d.color}→${a.color}`, part: a.part })
    if (!data && !type.length && Math.abs(a.w - d.w) > 4) findings.push({ kind: 'text-width', text: d.text, detail: `${d.w}→${a.w}px` })
  }
  for (const f of findings) {
    const rule = allow.find((r) => new RegExp(r.frame).test(entry.frame) && r.kind === f.kind && new RegExp(r.match).test(`${f.text} ${f.detail ?? ''}`))
    if (rule) f.accepted = rule.reason
  }
  return { pairs: pairs.length, wanted: want.length, findings }
}

const results = []
// A browser context for an account: through AUTH_MODULE, a saved storage state, or signed out.
async function openContext(account, options) {
  if (auth?.openSession && account) {
    const { context, page } = await auth.openSession(browser, { app, account, ...options })
    await page?.close()
    return context
  }
  const state = account && process.env.STORAGE_STATE_DIR ? path.join(process.env.STORAGE_STATE_DIR, `${account}.json`) : null
  return browser.newContext({ locale: LOCALE, ...options, ...(state ? { storageState: state } : {}) })
}
// One context per account and screen class, reused by every frame that shares it; each frame opens its own page,
// so signing in happens once per context instead of once per frame.
const contexts = new Map()
function contextFor(entry, width) {
  const mobile = width < 500
  const key = `${entry.account}|${mobile ? 'phone' : width}`
  if (!contexts.has(key))
    contexts.set(key, openContext(entry.account, { viewport: { width, height: 900 }, deviceScaleFactor: 1, ...(mobile ? { isMobile: true, hasTouch: true } : {}), reducedMotion: 'reduce', colorScheme: 'light' }))
  return contexts.get(key)
}
async function applyScenario(page, scenario) {
  if (auth?.applyScenario) return auth.applyScenario(page, { app, scenario })
  // Read the session first, then apply; a scenario that doesn't apply is an error, never a silent run on the default
  // account.
  const endpoint = process.env.SCENARIO_ENDPOINT
  const headers = { origin: app, ...JSON.parse(process.env.SCENARIO_HEADERS) }
  await page.request.get(`${app}${endpoint}`)
  const applied = await page.request.post(`${app}${endpoint}`, { headers, data: { scenarioId: scenario } })
  if (!applied.ok()) throw new Error(`scenario ${scenario} did not apply: ${applied.status()} ${(await applied.text()).slice(0, 120)}`)
}
// Frames that need a scenario or journey steps change review state, so they run one at a time after the rest.
let queue = entries.filter((e) => !e.scenario && !e.steps)
const serial = entries.filter((e) => e.scenario || e.steps)
// A journey frame is reached by steps from its route: { goto }, { click } (a visible button, link or menu item by name,
// else visible text), { fill, value } (a field label), { check } (a radio or checkbox label), { press } (a key) and
// { wait } (ms). "exact": false matches names as regular expressions.
async function runSteps(page, steps) {
  for (const [index, step] of steps.entries()) {
    try {
      await runStep(page, step)
    } catch (error) {
      throw new Error(`step ${index + 1} ${JSON.stringify(step)}: ${String(error).split('\n')[0]}`)
    }
  }
}

async function runStep(page, step) {
  if (step.goto) await page.goto(`${app}${step.goto}`, { waitUntil: 'networkidle', timeout: 60000 })
  else if (step.click) {
    const name = step.exact === false ? new RegExp(step.click) : step.click
    const target = page
      .getByRole('button', { name, exact: step.exact !== false })
      .or(page.getByRole('link', { name, exact: step.exact !== false }))
      .or(page.getByRole('menuitem', { name, exact: step.exact !== false }))
      .filter({ visible: true })
      .first()
    if (await target.count()) await target.click({ timeout: 10000 })
    else await page.getByText(name, { exact: step.exact !== false }).filter({ visible: true }).first().click({ timeout: 10000 })
  } else if (step.fill)
    await page.getByLabel(step.fill, { exact: step.exact !== false }).filter({ visible: true }).first().fill(step.value ?? '', { timeout: 10000 })
  else if (step.check)
    await page.getByLabel(step.check, { exact: step.exact !== false }).filter({ visible: true }).first().check({ timeout: 10000, force: true })
  else if (step.press) await page.keyboard.press(step.press)
  else if (step.wait) await page.waitForTimeout(step.wait)
  if (!step.wait) {
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(300)
  }
}

async function worker() {
  for (let e = queue.shift(); e; e = queue.shift()) {
    const specFile = path.join(specDir, `${e.frame}.json`)
    if (!fs.existsSync(specFile)) {
      results.push({ entry: e, error: 'no spec' })
      continue
    }
    const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'))
    // A design frame's screen is its full width, border included (a 1440 frame draws 1438 inside a 1px border).
    const width = spec.width + 2 * (spec.border ?? 0)
    const context = await contextFor(e, width)
    const page = await context.newPage()
    // A dev server's floating tools can cover a phone's bottom edge and take clicks; they aren't the app.
    if (HIDE.length)
      await page.addInitScript((css) =>
        document.addEventListener('DOMContentLoaded', () => {
          const style = document.createElement('style')
          style.textContent = css
          document.head.append(style)
        }),
      `${HIDE.join(',')}{display:none!important}`)
    try {
      await page.setViewportSize({ width, height: Math.max(spec.height, 640) })
      if (e.scenario) await applyScenario(page, e.scenario)
      await page.goto(`${app}${e.route}`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForTimeout(500)
      if (e.steps) await runSteps(page, e.steps)
      if (themeName) await page.evaluate(([n, v]) => document.documentElement.setAttribute(n, v), [themeName, themeValue ?? ''])
      // Headless Chromium draws a classic scrollbar that takes width a Mac's overlay scrollbar doesn't.
      await page.addStyleTag({ content: 'html { scrollbar-width: none; }' })
      await page.waitForTimeout(100)
      const actual = await page.evaluate(extractScreen, { rootSelector: 'body', shellLabels: SHELL, ...patterns })
      results.push({ entry: e, label: spec.label, ...compare(e, spec, actual) })
    } catch (error) {
      results.push({ entry: e, error: String(error).slice(0, 200) })
    } finally {
      await page.close()
    }
  }
}
const started = Date.now()
await Promise.all(Array.from({ length: Math.max(1, Math.min(jobs, queue.length)) }, worker))
queue = serial
await worker()
for (const c of contexts.values()) await (await c).close()
await browser.close()

// 3. Report.
const order = ['copy-different', 'copy-missing', 'copy-extra', 'title-offset', 'panel', 'spacing', 'position', 'type', 'colour', 'text-width']
results.sort((a, b) => a.entry.frame.localeCompare(b.entry.frame))
const hex = (c) => {
  const m = c.match(/\d+(\.\d+)?/g)
  return m ? '#' + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('') : c
}
// The same type or colour difference on several texts of one frame is one line, with the texts it covers.
function collapse(findings) {
  const out = [], seen = new Map()
  for (const f of findings) {
    if (f.kind !== 'colour' && f.kind !== 'type') {
      out.push(f)
      continue
    }
    const detail = f.kind === 'colour' ? f.detail.replace(/rgba?\([^)]*\)/g, hex) : f.detail
    const key = `${f.kind}|${detail}|${f.accepted ?? ''}`
    if (!seen.has(key)) {
      const g = { ...f, detail, texts: [] }
      seen.set(key, g)
      out.push(g)
    }
    seen.get(key).texts.push(f.text)
  }
  return out.map((g) => (g.texts ? { ...g, text: g.texts.length > 1 ? `${g.texts.length} texts (${g.texts.slice(0, 3).map((t) => t.slice(0, 28)).join('; ')}${g.texts.length > 3 ? '; …' : ''})` : g.texts[0] } : g))
}
// Patterns: a difference that repeats across frames is a system decision, read once.
const repeats = new Map()
for (const r of results) for (const f of collapse(r.findings ?? [])) {
  if (f.accepted || !['colour', 'type', 'title-offset'].includes(f.kind)) continue
  const key = `${f.kind} · ${f.kind === 'title-offset' ? f.detail.replace(/\(frame.*\)/, '').trim() : f.detail}`
  repeats.set(key, (repeats.get(key) ?? 0) + 1)
}
// By component: which design-system part draws each repeated difference, so the fix lands in one place.
const byPart = new Map()
for (const r of results) for (const f of r.findings ?? []) {
  if (f.accepted || !['colour', 'type'].includes(f.kind)) continue
  const detail = f.kind === 'colour' ? f.detail.replace(/rgba?\([^)]*\)/g, hex) : f.detail
  const key = `${f.part || '(page)'} | ${f.kind} · ${detail}`
  if (!byPart.has(key)) byPart.set(key, { frames: new Set(), texts: new Set() })
  byPart.get(key).frames.add(r.entry.frame)
  byPart.get(key).texts.add(f.text.slice(0, 24))
}
const lines = [`# Design contract check`, '', `${results.length} frames · ${((Date.now() - started) / 1000).toFixed(0)}s · app ${app} · tolerance ${TOL}px`, '']
const parts = [...byPart.entries()].sort((a, b) => b[1].frames.size - a[1].frames.size)
if (parts.length) lines.push('## By component', '', '| App part | Difference | Frames | Examples |', '|---|---|---|---|', ...parts.slice(0, 60).map(([k, v]) => { const [part, diff] = k.split(' | '); return `| ${part} | ${diff} | ${v.frames.size} | ${[...v.texts].slice(0, 3).join('; ')} |` }), '')
const repeated = [...repeats.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1])
if (repeated.length) lines.push('## Patterns across frames', '', '| Difference | Frames |', '|---|---|', ...repeated.map(([k, n]) => `| ${k} | ${n} |`), '')
lines.push('| Frame | Route | Matched | Open | Accepted |', '|---|---|---|---|---|')
for (const r of results) {
  if (r.error) {
    lines.push(`| ${r.entry.frame} | ${r.entry.route} | error: ${r.error} | | |`)
    continue
  }
  const c = collapse(r.findings)
  const open = c.filter((f) => !f.accepted).length
  lines.push(`| ${r.entry.frame} | ${r.entry.route} | ${r.pairs}/${r.wanted} texts | ${open} | ${c.length - open} |`)
}
for (const r of results) {
  if (r.error || !r.findings.length) continue
  lines.push('', `## ${r.entry.frame} · ${r.label ?? ''}`, '')
  for (const f of collapse(r.findings).sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)))
    lines.push(`- ${f.accepted ? '~~' : ''}**${f.kind}** · ${f.text}${f.detail ? ` · ${f.detail}` : ''}${f.at ? ` · at ${f.at}` : ''}${f.accepted ? `~~ (accepted: ${f.accepted})` : ''}`)
}
fs.writeFileSync(path.join(outDir, 'report.md'), lines.join('\n') + '\n')
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(results, null, 1))
const open = results.reduce((n, r) => n + (r.findings ? collapse(r.findings).filter((f) => !f.accepted).length : 0), 0)
console.log(`${results.length} frames in ${((Date.now() - started) / 1000).toFixed(0)}s · ${open} open findings · ${path.join(outDir, 'report.md')}`)
