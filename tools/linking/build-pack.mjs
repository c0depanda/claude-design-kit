// Builds a re-mark pack from two copies of the design export: the files as Claude Design has them now (before) and
// the same files after your scripted change (after). A change may add, remove or correct marks (data-component*) and
// change class, style or data-state on tags inside frames. Text and every other attribute must stay as they are,
// apart from exact text fixes listed in --fixes. Claude Design repeats the change with kit-run.js, and fingerprints
// prove its result is the one built here.
//   node build-pack.mjs <before dir> <after dir> <pack dir> [--fixes fixes.json] [--protect <regex>] [--only <regex>]
//                       [--skip <regex>] [--result <dir>]
// fixes.json: [{ "file": "<code or name>", "find": "<exact text>", "replace": "<text>", "count": <times found> }]
// --protect   frames whose label matches are never touched (default \bEMAIL\b: emails keep their inline styles)
// --only      only files whose name matches
// --skip      leave out files whose name matches (the components page, when it travels whole in a library pack)
// --result    also writes the toolkit's result for each changed file there, for compare-render.mjs and index.mjs
// Writes <pack dir>/kit-remarks.json, kit-link.js, kit-run.js and fingerprints.json, and prints one line per file.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { L, sha, code, designFiles, finishPack } from './pack-common.mjs'

process.on('uncaughtException', (error) => {
  console.error(`${process.argv[1].split('/').pop()}: ${error.message}`)
  process.exit(1)
})
const args = process.argv.slice(2)
const [beforeDir, afterDir, packDir] = args
if (!beforeDir || !afterDir || !packDir || beforeDir.startsWith('-')) {
  console.log('usage: node build-pack.mjs <before dir> <after dir> <pack dir> [--fixes fixes.json] [--protect <regex>] [--only <regex>] [--skip <regex>] [--result <dir>]')
  process.exit(beforeDir === '--help' || beforeDir === '-h' ? 0 : 1)
}
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index > 0 ? args[index + 1] : fallback
}
const protect = option('protect', '\\bEMAIL\\b')
const only = option('only', null)
const skip = option('skip', null)
const resultDir = option('result', null)
const fixes = option('fixes', null) ? JSON.parse(await readFile(option('fixes'), 'utf8')) : []
await mkdir(packDir, { recursive: true })
if (resultDir) await mkdir(resultDir, { recursive: true })

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
const MARKS = /\s+data-component(?:-[a-z]+)?\s*=\s*"[^"]*"/g
// What a re-mark may change on a tag: its marks, class, style and data-state (the same rule as proveRemarks).
const loose = (raw) => raw.replace(MARKS, '').replace(/\s(?:class|style|data-state)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+)/g, '')
const ATTRIBUTE = /\s([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g
const attributeSet = (raw) => [...raw.matchAll(ATTRIBUTE)].map((a) => `${a[1].toLowerCase()}=${a[2] ?? a[3] ?? a[4] ?? ''}`).sort().join('\n')
const lineOf = (text, at) => text.slice(0, at).split('\n').length

function marksOf(raw) {
  const marks = {}
  for (const a of raw.matchAll(/\sdata-component(?:-([a-z]+))?\s*=\s*"([^"]*)"/g)) marks[a[1] ? `data-component-${a[1]}` : 'data-component'] = a[2]
  return marks['data-component'] === undefined ? null : marks
}

function changeOf(before, after) {
  const change = { to: marksOf(after) }
  const set = {}
  for (const [key, name] of [['class', 'class'], ['style', 'style'], ['state', 'data-state']]) {
    const was = L.attribute(before, name)
    const now = L.attribute(after, name)
    if (was !== now) set[key] = now
  }
  if (Object.keys(set).length) change.set = set
  return change
}

const files = {}
let totalParts = 0
let totalFixes = 0
for (const name of await designFiles(afterDir)) {
  if ((only && !new RegExp(only).test(name)) || (skip && new RegExp(skip).test(name))) continue
  const original = await readFile(path.join(beforeDir, name), 'utf8').catch(() => null)
  if (original === null) throw new Error(`${name} is new in the after folder; a pack changes existing files only`)
  const after = await readFile(path.join(afterDir, name), 'utf8')
  if (original === after) continue
  const own = fixes.filter((fix) => fix.file === name || fix.file === code(name))
  let before = original
  for (const fix of own) {
    const found = before.split(fix.find).length - 1
    if (found !== fix.count) throw new Error(`${code(name)}: fix expected ${fix.count} matches, found ${found}`)
    before = before.split(fix.find).join(fix.replace)
  }

  // Line the tags up one to one: the same tags, the same text between them.
  const a = [...before.matchAll(TAG)]
  const b = [...after.matchAll(TAG)]
  if (a.length !== b.length) throw new Error(`${code(name)}: ${a.length} tags before, ${b.length} after; only attributes may change (use --fixes for text)`)
  const changed = []
  let lastA = 0
  let lastB = 0
  for (let i = 0; i < a.length; i++) {
    if (before.slice(lastA, a[i].index) !== after.slice(lastB, b[i].index))
      throw new Error(`${code(name)}: text differs before the tag on line ${lineOf(after, b[i].index)}; use --fixes for text`)
    lastA = a[i].index + a[i][0].length
    lastB = b[i].index + b[i][0].length
    if (a[i][0] === b[i][0]) continue
    if (a[i][1] !== b[i][1] || a[i][2] !== b[i][2] || a[i][4] !== b[i][4])
      throw new Error(`${code(name)}: the tag on line ${lineOf(after, b[i].index)} changes kind; only attributes may change`)
    if (loose(a[i][3] || '') !== loose(b[i][3] || ''))
      throw new Error(`${code(name)}: the tag on line ${lineOf(after, b[i].index)} changes more than marks, class, style and data-state`)
    changed.push(i)
  }
  if (before.slice(lastA) !== after.slice(lastB)) throw new Error(`${code(name)}: text differs after the last tag`)

  // Name each changed tag the way applyRemarks finds it: its pattern and marks, and its order among the same.
  const parts = L.markedParts(before, protect, true)
  const byAt = new Map()
  const seen = {}
  const total = {}
  for (const part of parts) total[part.id] = (total[part.id] ?? 0) + 1
  for (const part of parts) byAt.set(part.at, { ...part, n: (seen[part.id] = (seen[part.id] ?? -1) + 1) })
  const groups = {}
  for (const i of changed) {
    const part = byAt.get(a[i].index)
    if (!part)
      throw new Error(`${code(name)}: the tag on line ${lineOf(after, b[i].index)} is outside a frame, a frame's own tag, in a protected frame or malformed; a re-mark can't reach it (use --fixes)`)
    ;(groups[part.id] ??= []).push({ n: part.n, end: part.end, change: changeOf(a[i][3] || '', b[i][3] || '') })
  }
  const remarks = {}
  for (const [id, list] of Object.entries(groups)) {
    const same = list.every((item) => JSON.stringify(item.change) === JSON.stringify(list[0].change))
    if (same && list.length === total[id]) remarks[id] = { count: total[id], all: list[0].change }
    else {
      const entry = { count: total[id], at: {}, probe: {} }
      for (const item of list) {
        entry.at[item.n] = item.change
        // The text after the tag tells the part apart from look-alikes of the same pattern.
        entry.probe[item.n] = (await L.digest(before.slice(item.end, item.end + 160))).slice(0, 16)
      }
      remarks[id] = entry
    }
  }

  // Run the toolkit as Claude Design will, and check it reaches the same file.
  const result = await L.applyRemarks(before, remarks, protect)
  if (result.changed !== changed.length) throw new Error(`${code(name)}: the toolkit changed ${result.changed} tags, expected ${changed.length}`)
  const proof = L.proveRemarks(before, result.text)
  if (!proof.ok) throw new Error(`${code(name)}: the toolkit's result fails its own proof (${proof.reason})`)
  let match = 'identical'
  if (result.text !== after) {
    const r = [...result.text.matchAll(TAG)]
    let reordered = 0
    for (let i = 0; i < r.length; i++) {
      if (r[i][0] === b[i][0]) continue
      if (attributeSet(r[i][3] || '') !== attributeSet(b[i][3] || ''))
        throw new Error(`${code(name)}: the toolkit's tag on line ${lineOf(after, b[i].index)} differs from yours`)
      reordered++
    }
    match = `same elements, attribute order differs on ${reordered} tags`
  }
  if (resultDir) await writeFile(path.join(resultDir, name), result.text)
  files[name] = {
    before: sha(original),
    after: sha(result.text),
    marked: result.changed,
    protectedFrames: protect,
    remarks,
    ...(own.length ? { fixes: own.map(({ find, replace, count }) => ({ find, replace, count })) } : {}),
  }
  totalParts += result.changed
  totalFixes += own.length
  console.log(`${code(name)}: ${result.changed} parts in ${Object.keys(remarks).length} patterns, ${own.length} fixes · ${match}`)
}

if (!Object.keys(files).length) {
  console.log('No file differs between the two folders.')
  process.exit(0)
}
await writeFile(path.join(packDir, 'kit-remarks.json'), JSON.stringify({ mode: 'remarks', files }))
const summary = await finishPack(packDir, ['kit-link.js', 'kit-run.js'], {
  remarks: { files: Object.keys(files).length, parts: totalParts, fixes: totalFixes },
  files: Object.fromEntries(Object.entries(files).map(([name, f]) => [code(name), { before: f.before, after: f.after, parts: f.marked }])),
})
console.log(JSON.stringify({ remarks: summary.remarks, pack: summary.pack }))
