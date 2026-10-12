// Builds an install pack for the component library and the components page that shows it, from a local copy of the
// design project where you have the new versions.
//   node build-library-pack.mjs <design dir> <pack dir> --files <path>[,<path>…] [--reference <code or file name>]
// --files      the library files, relative to the design dir (for example
//              components/hx-tokens.css,components/hx.css)
// --reference  the components page (for example F1d); saved through tmp/ and copy_files, as CLAUDE.md requires
// Writes <pack dir>/kit-library.json, kit-link.js, kit-install.js and fingerprints.json.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { sha, code, designFiles, resolveFile, finishPack } from './pack-common.mjs'

process.on('uncaughtException', (error) => {
  console.error(`${process.argv[1].split('/').pop()}: ${error.message}`)
  process.exit(1)
})
const args = process.argv.slice(2)
const [designDir, packDir] = args
const option = (name) => {
  const index = args.indexOf(`--${name}`)
  return index > 0 ? args[index + 1] : null
}
if (!designDir || !packDir || designDir.startsWith('-') || !option('files')) {
  console.log('usage: node build-library-pack.mjs <design dir> <pack dir> --files <path>[,<path>…] [--reference <code or file name>]')
  process.exit(designDir === '--help' || designDir === '-h' ? 0 : 1)
}
await mkdir(packDir, { recursive: true })
const files = {}
for (const name of option('files').split(',').map((s) => s.trim()).filter(Boolean)) {
  const text = await readFile(path.join(designDir, name), 'utf8')
  files[name] = { text, sha256: sha(text) }
}
let reference = null
if (option('reference')) {
  const name = resolveFile(await designFiles(designDir), option('reference'))
  const text = await readFile(path.join(designDir, name), 'utf8')
  const plain = code(name).replace(/[^A-Za-z0-9.-]+/g, '-')
  reference = { name, working: `tmp/w${plain}.html`, check: `tmp/check-${plain}.html`, text, sha256: sha(text) }
}
await writeFile(path.join(packDir, 'kit-library.json'), JSON.stringify({ files, ...(reference ? { reference } : {}) }))
const summary = await finishPack(packDir, ['kit-link.js', 'kit-install.js'], {
  library: Object.fromEntries(Object.entries(files).map(([name, file]) => [name, file.sha256])),
  ...(reference ? { reference: { file: reference.name, sha256: reference.sha256 } } : {}),
})
console.log(JSON.stringify({ library: summary.library, reference: summary.reference ?? null, pack: summary.pack }))
