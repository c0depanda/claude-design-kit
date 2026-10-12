// Runs a pack end to end on a copy of the design project the way Claude Design does: run_script calls with readFile
// and saveFile that refuse names containing '·' or ',' (saveFile writes '·' as '-'), a 30-second limit per call,
// copy_files for the canonical names, phases repeated until nothing remains. Prints each call's result line, which
// is what Claude Design should report back.
//   node run-pack-local.mjs <project copy> <pack dir> [--only-rules | --only-install | --only-run] [--pack kit-remarks.json]
// The project copy is changed in place, so give it a copy (never the export you read from). In order: a pack dir
// holding kit-rules.json appends its rules (kit-rules.js), one holding kit-library.json is installed (kit-install.js),
// and one holding the run pack is run (kit-run.js).
import { readFile, writeFile, mkdir, copyFile, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const [root, packDir] = process.argv.slice(2)
if (!root || !packDir || root === '--help' || root === '-h') {
  console.log('usage: node run-pack-local.mjs <project copy> <pack dir> [--only-rules | --only-install | --only-run] [--pack kit-remarks.json]')
  process.exit(root === '--help' || root === '-h' ? 0 : 1)
}
const only = process.argv.find((a) => a.startsWith('--only-'))
const packIndex = process.argv.indexOf('--pack')
const packName = packIndex > 0 ? process.argv[packIndex + 1] : 'kit-remarks.json'
await mkdir(path.join(root, 'uploads'), { recursive: true })
for (const f of await readdir(packDir)) if (/\.(js|json)$/.test(f) && f !== 'fingerprints.json') await copyFile(path.join(packDir, f), path.join(root, 'uploads', f))

const plain = (name) => {
  if (/[·,]/.test(name)) throw new Error(`the sandbox cannot open ${name}`)
  return path.join(root, name)
}
const readFileS = async (name) => readFile(plain(name), 'utf8')
const saveFile = async (name, text) => {
  const target = path.join(root, name.replace(/·/g, '-'))
  if (/,/.test(name)) throw new Error(`the sandbox cannot save ${name}`)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, text)
}
const copyFiles = async (list) => {
  for (const { src, dest } of list) {
    await mkdir(path.dirname(path.join(root, dest)), { recursive: true })
    await copyFile(path.join(root, src), path.join(root, dest))
  }
  return list.length
}
let calls = 0
async function runScript(source) {
  calls++
  const started = Date.now()
  // The script body is what the brief tells Claude Design to run: an async function evaluated from uploads/.
  const fn = eval(`(async ({ readFile, saveFile }) => { ${source} })`)
  const result = await fn({ readFile: readFileS, saveFile })
  const took = Date.now() - started
  if (took > 30000) throw new Error(`a run took ${took} ms, over the sandbox's 30 s`)
  return { result: JSON.parse(result), took }
}
const log = (label, r) => console.log(`${label} (${r.took} ms): ${JSON.stringify(r.result).slice(0, 600)}`)

const wants = (part) => !only || only === `--only-${part}`
if (wants('rules') && existsSync(path.join(packDir, 'kit-rules.json'))) {
  // R. Standing rules.
  const r = await runScript(`return await eval(await readFile('uploads/kit-rules.js'))({ readFile, saveFile })`)
  log('R rules', r)
  if (!r.result.ok) process.exit(1)
}
if (wants('install') && existsSync(path.join(packDir, 'kit-library.json'))) {
  // A. The library and the components page.
  let r = await runScript(`return await eval(await readFile('uploads/kit-install.js'))({ readFile, saveFile, phase: 'save' })`)
  log('A1 install save', r)
  if (!r.result.ok) process.exit(1)
  if (r.result.copy_files_to_canonical) {
    await copyFiles(r.result.copy_files_to_canonical)
    await copyFiles(r.result.copy_files_for_check)
  }
  r = await runScript(`return await eval(await readFile('uploads/kit-install.js'))({ readFile, saveFile, phase: 'verify' })`)
  log('A3 install verify', r)
  if (!r.result.ok) process.exit(1)
  for (const d of r.result.delete) await rm(path.join(root, d))
}
if (wants('run') && existsSync(path.join(packDir, packName))) {
  // B. Marks, rewrites or re-marks.
  const call = (phase) => runScript(`return await eval(await readFile('uploads/kit-run.js'))({ readFile, saveFile, pack: '${packName}', phase: '${phase}' })`)
  let r = await call('prepare')
  console.log(`B1 prepare (${r.took} ms): files ${r.result.files}, copy_files ${r.result.copy_files.length}`)
  await copyFiles(r.result.copy_files)
  let runs = 0
  do {
    r = await call('mark')
    runs++
  } while (r.result.remaining > 0)
  log(`B2 mark × ${runs}`, r)
  r = await call('finish')
  if (r.result.error) {
    log('B3 finish', r)
    process.exit(1)
  }
  console.log(`B3 finish (${r.took} ms): to canonical ${r.result.copy_files_to_canonical.length}, for check ${r.result.copy_files_for_check.length}`)
  await copyFiles(r.result.copy_files_to_canonical)
  await copyFiles(r.result.copy_files_for_check)
  runs = 0
  do {
    r = await call('verify')
    runs++
  } while (r.result.remaining > 0)
  log(`B4 verify × ${runs}`, r)
  await rm(path.join(root, 'tmp'), { recursive: true, force: true })
}
console.log(`run_script calls: ${calls}`)
