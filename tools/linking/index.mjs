// Indexes every frame of the design export for implementation: id, label, width, the components it uses (with
// variants), the frames it links to, and a fingerprint of its markup. Also writes which frames use each component,
// and, given an earlier index, the frames added, changed and removed since.
//   node index.mjs <design dir> <out dir> [--since <earlier out dir>]
// Per file it writes <out>/frames/<code>.json; component-usage.json lists the frames using each component and variant;
// with --since, changes.json lists the frames added, changed and removed since that earlier index.
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const [design, out] = process.argv.slice(2)
if (!design || !out || design === '--help' || design === '-h') {
  console.log('usage: node index.mjs <design dir> <out dir> [--since <earlier out dir>]')
  process.exit(design === '--help' || design === '-h' ? 0 : 1)
}
const sinceIndex = process.argv.indexOf('--since')
const since = sinceIndex > 0 ? process.argv[sinceIndex + 1] : null
const L = eval(await readFile(new URL('./kit-link.js', import.meta.url), 'utf8'))
await mkdir(path.join(out, 'frames'), { recursive: true })

const usage = {}
const all = {}
for (const name of (await readdir(design)).filter((f) => f.endsWith('.dc.html')).sort()) {
  const code = name.split(' ')[0]
  const text = await readFile(path.join(design, name), 'utf8')
  const frames = []
  for (const f of L.frameSpans(text)) {
    const markup = text.slice(f.start, f.end)
    const open = markup.slice(0, markup.indexOf('>') + 1)
    const id = (open.match(/\sid="([^"]*)"/) ?? [])[1] ?? null
    const width = Number((open.match(/(?:^|[;"\s])width:\s*(\d+)px/) ?? [])[1]) || null
    const components = {}
    for (const m of markup.matchAll(/<[a-zA-Z][\w-]*((?:"[^"]*"|[^>"])*)>/g)) {
      const attrs = m[1]
      const component = (attrs.match(/\sdata-component="([^"]+)"/) ?? [])[1]
      if (!component) continue
      const variant = [...attrs.matchAll(/\sdata-component-([a-z]+)="([^"]*)"/g)].map(([, k, v]) => `${k}=${v}`).sort().join(' ')
      const key = variant ? `${component} ${variant}` : component
      components[key] = (components[key] ?? 0) + 1
    }
    const links = [...new Set([...markup.matchAll(/\shref="#([^"]+)"/g)].map((m) => m[1]))]
    const entry = { id, label: f.label, width, hash: L.sha256(markup.replace(/\s+/g, ' ')).slice(0, 16), components, links }
    frames.push(entry)
    for (const key of Object.keys(components)) (usage[key] ??= []).push(`${code} ${id ?? f.label}`)
    all[`${code} ${id ?? f.label}`] = entry.hash
  }
  await writeFile(path.join(out, 'frames', `${code}.json`), JSON.stringify({ file: name, frames }, null, 1))
}
await writeFile(path.join(out, 'component-usage.json'), JSON.stringify(Object.fromEntries(Object.entries(usage).sort()), null, 1))
await writeFile(path.join(out, 'frame-hashes.json'), JSON.stringify(all))
let changes = null
if (since) {
  const before = JSON.parse(await readFile(path.join(since, 'frame-hashes.json'), 'utf8'))
  changes = {
    added: Object.keys(all).filter((k) => !(k in before)),
    removed: Object.keys(before).filter((k) => !(k in all)),
    changed: Object.keys(all).filter((k) => k in before && before[k] !== all[k]),
  }
  await writeFile(path.join(out, 'changes.json'), JSON.stringify(changes, null, 1))
}
console.log(JSON.stringify({ frames: Object.keys(all).length, components: Object.keys(usage).length, ...(changes ? { added: changes.added.length, changed: changes.changed.length, removed: changes.removed.length } : {}) }))
