// Appends a section of standing rules to a text file in the design project (usually CLAUDE.md), once. Evaluates to
// one async function:
//   return await eval(await readFile('uploads/kit-rules.js'))({ readFile, saveFile })
// If the file is exactly the version the pack was built from, the result is checked by fingerprint
// (matchedExport: true). If it changed since, the section is appended to whatever is there (matchedExport: false).
// A file that already holds the section's heading is left alone (already: true), so running it twice is safe.
// The pack (kit-rules.json, built by build-rules-pack.mjs) holds { file, heading, section, before, after }.
async ({ readFile, saveFile, pack: packName = 'kit-rules.json', uploads = 'uploads' }) => {
  const L = eval(await readFile(`${uploads}/kit-link.js`))
  const pack = JSON.parse(await readFile(`${uploads}/${packName}`))
  const current = await readFile(pack.file)
  if (current.includes(pack.heading)) return JSON.stringify({ ok: true, already: true })
  const next = current.replace(/\n*$/, '\n') + pack.section
  const matchedExport = (await L.digest(current)) === pack.before
  if (matchedExport && (await L.digest(next)) !== pack.after) return JSON.stringify({ ok: false, reason: 'result differs from the verified result' })
  await saveFile(pack.file, next)
  const saved = await readFile(pack.file)
  return JSON.stringify({ ok: saved === next, matchedExport, characters: saved.length })
}
