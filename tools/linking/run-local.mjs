// Fingerprints a local Claude Design export with the toolkit, exactly as Claude Design's run_script would.
//   node run-local.mjs census [--design <dir>] [--out <dir>] [--label "<which export>"]
// Writes <out>/census.json (per file: SHA-256, size, frames, inline styles, literal colours, references) and
// <out>/expected-census.json, the fingerprints a "check the project" script compares Claude Design's copy with.
// --design defaults to DESIGN_DIR, else ./Design.
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const step = args[0]
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index > 0 ? args[index + 1] : fallback
}
if (step !== 'census') {
  console.log('usage: node run-local.mjs census [--design <dir>] [--out <dir>] [--label "<which export>"]')
  process.exit(step === '--help' || step === '-h' ? 0 : 1)
}
const design = path.resolve(option('design', process.env.DESIGN_DIR || path.join(process.cwd(), 'Design')))
const out = path.resolve(option('out', 'out'))
const label = option('label', `Claude Design export in ${design}`)
await mkdir(out, { recursive: true })

// eslint-disable-next-line no-eval -- the toolkit is evaluated exactly as Claude Design's run_script evaluates it
const L = eval(await readFile(path.join(here, 'kit-link.js'), 'utf8'))
const readDesign = (name) => readFile(path.join(design, name), 'utf8')
const canonical = (await readdir(design)).filter((name) => name.endsWith('.dc.html')).sort()

const rows = await L.census({ readFile: readDesign, files: canonical })
for (const row of rows) {
  const expected = createHash('sha256').update(await readDesign(row.file), 'utf8').digest('hex')
  if (expected !== row.sha256) throw new Error(`toolkit SHA-256 disagrees with node for ${row.file}`)
}
await writeFile(path.join(out, 'census.json'), JSON.stringify(rows, null, 1))
const totals = rows.reduce(
  (sum, row) => ({
    frames: sum.frames + row.frames,
    inlineStyles: sum.inlineStyles + row.inlineStyles,
    hexColours: sum.hexColours + row.hexColours,
    characters: sum.characters + row.characters,
  }),
  { frames: 0, inlineStyles: 0, hexColours: 0, characters: 0 },
)
console.log(JSON.stringify({ files: rows.length, ...totals, combined: await L.combined(rows) }))

// What Claude Design checks its copy against: fingerprints, plus every text file the designs load.
const textReferences = [...new Set(rows.flatMap((row) => row.references))]
  .filter((reference) => /\.(css|js|html)$/.test(reference) && !reference.startsWith('{'))
  .sort()
const expected = {
  export: label,
  combined: await L.combined(rows),
  files: rows.map(({ file, sha256 }) => ({ file, sha256 })),
  textReferences,
}
await writeFile(path.join(out, 'expected-census.json'), JSON.stringify(expected, null, 1))
const check = await L.verify({ readFile: readDesign, expected })
console.log(JSON.stringify({ ...check, files: undefined }))
