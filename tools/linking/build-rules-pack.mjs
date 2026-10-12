// Builds a pack that appends a section of standing rules to a file in the design project (usually CLAUDE.md).
//   node build-rules-pack.mjs <current file> <section.md> <pack dir> [--target CLAUDE.md]
// <current file> is the file as Claude Design has it now (from the latest export); <section.md> is the section to
// append, starting with its "## " heading. --target is the file's path inside the design project (default: the
// current file's name). Writes <pack dir>/kit-rules.json, kit-link.js, kit-rules.js and fingerprints.json.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { sha, finishPack } from './pack-common.mjs'

process.on('uncaughtException', (error) => {
  console.error(`build-rules-pack.mjs: ${error.message}`)
  process.exit(1)
})
const args = process.argv.slice(2)
const [currentFile, sectionFile, packDir] = args
if (!currentFile || !sectionFile || !packDir || currentFile.startsWith('-')) {
  console.log('usage: node build-rules-pack.mjs <current file> <section.md> <pack dir> [--target CLAUDE.md]')
  process.exit(currentFile === '--help' || currentFile === '-h' ? 0 : 1)
}
const targetIndex = args.indexOf('--target')
const file = targetIndex > 0 ? args[targetIndex + 1] : path.basename(currentFile)
const current = await readFile(currentFile, 'utf8')
const raw = await readFile(sectionFile, 'utf8')
const heading = raw.split('\n').find((line) => line.startsWith('## '))
if (!heading) throw new Error('the section must start with a "## " heading')
if (current.includes(heading)) throw new Error(`${file} already holds "${heading}"`)
// The same text the script appends: one blank line, then the section, ending in a newline.
const section = '\n' + raw.replace(/^\n+/, '').replace(/\n*$/, '\n')
const after = current.replace(/\n*$/, '\n') + section
await mkdir(packDir, { recursive: true })
await writeFile(path.join(packDir, 'kit-rules.json'), JSON.stringify({ file, heading, before: sha(current), section, after: sha(after) }))
const summary = await finishPack(packDir, ['kit-link.js', 'kit-rules.js'], { rules: { file, heading, before: sha(current), after: sha(after) } })
console.log(JSON.stringify({ rules: summary.rules, pack: summary.pack }))
