// Shared by the pack builders: the toolkit as Claude Design evaluates it, file codes, and the pack's fingerprints.
import { createHash } from 'node:crypto'
import { copyFile, readFile, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const here = path.dirname(fileURLToPath(import.meta.url))
// eslint-disable-next-line no-eval -- the toolkit is evaluated exactly as Claude Design's run_script evaluates it
export const L = eval(await readFile(path.join(here, 'kit-link.js'), 'utf8'))
export const sha = (text) => createHash('sha256').update(text, 'utf8').digest('hex')
// A design file's code: its name up to the first space, middle dot, hyphen or underscore ('P1 Payments' -> 'P1').
export const code = (name) => name.replace(/\.dc\.html$/, '').split(/[ ·_-]/)[0]

export async function designFiles(dir) {
  return (await readdir(dir)).filter((name) => name.endsWith('.dc.html')).sort()
}

export function resolveFile(names, wanted) {
  const found = names.includes(wanted) ? [wanted] : names.filter((name) => code(name) === wanted)
  if (found.length !== 1) throw new Error(`${wanted} matches ${found.length} design files`)
  return found[0]
}

// Copies the scripts Claude Design runs into the pack, then records the SHA-256 of every pack file next to what the
// builder adds (merged with fingerprints.json if the pack already has one).
export async function finishPack(packDir, scripts, summary) {
  for (const script of scripts) await copyFile(path.join(here, script), path.join(packDir, script))
  const file = path.join(packDir, 'fingerprints.json')
  const current = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : {}
  const pack = {}
  for (const name of (await readdir(packDir)).sort())
    if (/\.(js|json)$/.test(name) && name !== 'fingerprints.json') pack[name] = sha(await readFile(path.join(packDir, name), 'utf8'))
  const next = { ...current, ...summary, pack }
  await writeFile(file, JSON.stringify(next, null, 1))
  return next
}
