// Installs the component library (and the components page that shows it) in Claude Design. Evaluates to one async
// function:
//   return await eval(await readFile('uploads/kit-install.js'))({ readFile, saveFile, phase: 'save' })
// 'save' writes each library file (for example components/<prefix>-tokens.css and components/<prefix>.css) and the
// components page's working copy to tmp/, reads each back and checks its fingerprint, then returns the copy_files
// lists. 'verify' checks the files where they ended up. The pack (kit-library.json, built by build-library-pack.mjs)
// holds { files: { <path>: { text, sha256 } }, reference?: { name, working, check, text, sha256 } }.
async ({ readFile, saveFile, phase, pack: packName = 'kit-library.json', uploads = 'uploads' }) => {
  const L = eval(await readFile(`${uploads}/kit-link.js`))
  const pack = JSON.parse(await readFile(`${uploads}/${packName}`))
  const read = async (name) => {
    try {
      return await readFile(name)
    } catch {
      return null
    }
  }
  const check = async (name, sha) => {
    const text = await read(name)
    return text !== null && (await L.digest(text)) === sha
  }
  const ref = pack.reference
  if (phase === 'save') {
    const results = {}
    for (const [name, file] of Object.entries(pack.files)) {
      await saveFile(name, file.text)
      results[name] = await check(name, file.sha256)
    }
    if (ref) {
      await saveFile(ref.working, ref.text)
      results[ref.working] = await check(ref.working, ref.sha256)
    }
    const ok = Object.values(results).every(Boolean)
    return JSON.stringify({
      phase,
      ok,
      saved: results,
      ...(ok && ref ? { copy_files_to_canonical: [{ src: ref.working, dest: ref.name, asset: '' }], copy_files_for_check: [{ src: ref.name, dest: ref.check }] } : {}),
    })
  }
  if (phase === 'verify') {
    const results = {}
    for (const [name, file] of Object.entries(pack.files)) results[name] = await check(name, file.sha256)
    if (ref) results[ref.name] = await check(ref.check, ref.sha256)
    return JSON.stringify({ phase, ok: Object.values(results).every(Boolean), verified: results, delete: ref ? [ref.working, ref.check] : [] })
  }
  return JSON.stringify({ error: `unknown phase ${phase}` })
}
