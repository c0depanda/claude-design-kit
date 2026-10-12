// Runner for script packs (marks, structure rewrites or re-marks, each with optional exact text fixes). Evaluates to
// one async function:
//   return await eval(await readFile('uploads/kit-run.js'))({ readFile, saveFile, pack: 'kit-remarks.json', phase: 'prepare' })
// The sandbox cannot open names containing '·' or ',' and stops a run after 30 seconds, so the script works on
// plain-named copies in tmp/ and resumes from tmp/<pack>-progress.json; each call stops starting new files after a
// time budget and says how many remain. A rewrites pack may carry library: { stylesheets, screenClass } (see
// kit-link.js).
// A file already in its changed state is reported under already and left alone, so running a prompt twice is safe.
// A file that changed since the export is saved only if removing every data-component attribute from the result gives
// the same text as removing them from the file after its listed fixes (so only marks were added); such a file reports
// its length. A re-mark pack's proof for such a file: every listed pattern is found exactly as often as verified, and
// tag by tag nothing changed but marks, plus class, style and data-state on the listed parts.
//   prepare  returns the copy_files list: canonical files → tmp/in-<code>.html
//   mark     marks the copies (call again until remaining is 0), saving tmp/mark-<code>.html
//   finish   returns the copy_files lists: marked copies → canonical files, then canonical files → tmp/check-<code>.html
//   verify   fingerprints the tmp/check copies (call again until remaining is 0)
async ({ readFile, saveFile, phase, pack: packName = 'kit-remarks.json', uploads = 'uploads', budgetMs = 8000 }) => {
  const L = eval(await readFile(`${uploads}/kit-link.js`))
  const pack = JSON.parse(await readFile(`${uploads}/${packName}`))
  const progressPath = `tmp/${packName.replace(/\.json$/, '')}-progress.json`
  const names = Object.keys(pack.files)
  // Working copies are named by the file's code (P1 for 'P1 Payments.dc.html'), or by the whole name made plain
  // when two files share a code.
  const short = (name) => name.replace(/\.dc\.html$/, '').split(/[ ·_-]/)[0]
  const unique = new Set(names.map(short)).size === names.length
  const code = (name) => (unique ? short(name) : name.replace(/\.dc\.html$/, '').replace(/[^A-Za-z0-9.-]+/g, '-'))
  const path = (kind, name) => `tmp/${kind}-${code(name)}.html`
  const labels = (text) => L.frameSpans(text).map((f) => f.label).join('\n')
  let progress
  try {
    progress = JSON.parse(await readFile(progressPath))
  } catch {
    progress = { files: {}, verified: {} }
  }
  const save = () => saveFile(progressPath, JSON.stringify(progress))
  const started = Date.now()
  const outOfTime = () => Date.now() - started > budgetMs

  if (phase === 'prepare') {
    await save()
    return JSON.stringify({ phase, files: names.length, copy_files: names.map((name) => ({ src: name, dest: path('in', name) })) })
  }

  if (phase === 'mark') {
    for (const name of names) {
      if (progress.files[name]) continue
      if (outOfTime()) break
      const entry = pack.files[name]
      let input
      try {
        input = await readFile(path('in', name))
      } catch {
        progress.files[name] = { status: 'failed', reason: 'no working copy in tmp/' }
        continue
      }
      try {
        const inputDigest = await L.digest(input)
        // Already changed (a second run of the same prompt): nothing to save.
        if (inputDigest === entry.after) {
          progress.files[name] = { status: 'already' }
          await save()
          continue
        }
        // Exact text fixes listed in the pack: each must match the stated number of times, or nothing is saved.
        for (const fix of entry.fixes ?? []) {
          const found = input.split(fix.find).length - 1
          if (found !== fix.count) throw new Error(`fix expected ${fix.count} matches, found ${found}`)
        }
        const fixed = (entry.fixes ?? []).reduce((text, fix) => text.split(fix.find).join(fix.replace), input)
        const rewriting = pack.mode === 'rewrites'
        const remarking = pack.mode === 'remarks'
        const result = remarking
          ? await L.applyRemarks(fixed, entry.remarks, entry.protectedFrames)
          : rewriting
            ? L.applyRewrites(fixed, entry.rewrites, entry.protectedFrames, pack.library)
            : L.applyMarks(fixed, entry.marks, entry.protectedFrames, { allowExisting: !!pack.allowExisting })
        const text = result.text
        const marked = remarking ? result.changed : rewriting ? result.rewritten : result.marked
        if (inputDigest === entry.before) {
          const after = await L.digest(text)
          if (marked !== entry.marked || after !== entry.after) {
            progress.files[name] = { status: 'failed', reason: 'result differs from the verified result' }
            continue
          }
          await saveFile(path('mark', name), text)
          progress.files[name] = { status: 'saved', how: 'fingerprint', marked, sha: after }
        } else {
          // Changed since the export: save only if removing the marks gives back this file exactly.
          // Rewrites can't be undone like marks, so the proof is the verified count of rewritten parts.
          const proofFailed = remarking
            ? marked !== entry.marked || !L.proveRemarks(fixed, text).ok
            : rewriting
              ? marked !== entry.marked
              : L.unmark(text) !== L.unmark(fixed)
          if (proofFailed || labels(text) !== labels(input)) {
            progress.files[name] = { status: 'failed', reason: 'changed since the export and the proof failed' }
            continue
          }
          await saveFile(path('mark', name), text)
          progress.files[name] = { status: 'saved', how: 'proof', marked, sha: await L.digest(text), seen: { length: input.length, digest: inputDigest.slice(0, 12) } }
        }
      } catch (error) {
        progress.files[name] = { status: 'failed', reason: String(error).slice(0, 120) }
      }
      await save()
    }
    await save()
    const rows = Object.entries(progress.files)
    return JSON.stringify({
      phase,
      done: rows.length,
      remaining: names.length - rows.length,
      saved: rows.filter(([, r]) => r.status === 'saved').length,
      already: rows.filter(([, r]) => r.status === 'already').map(([n]) => code(n)),
      markedByProof: rows.filter(([, r]) => r.how === 'proof').map(([n, r]) => `${code(n)} (read ${r.seen.length} characters, ${r.seen.digest})`),
      failed: rows.filter(([, r]) => r.status === 'failed').map(([n, r]) => `${code(n)}: ${r.reason}`),
    })
  }

  const saved = names.filter((name) => progress.files[name]?.status === 'saved')

  if (phase === 'finish') {
    if (names.some((name) => !progress.files[name])) return JSON.stringify({ phase, error: 'run mark until remaining is 0 first' })
    return JSON.stringify({
      phase,
      copy_files_to_canonical: saved.map((name) => ({ src: path('mark', name), dest: name, asset: '' })),
      copy_files_for_check: saved.map((name) => ({ src: name, dest: path('check', name) })),
    })
  }

  if (phase === 'verify') {
    for (const name of saved) {
      if (name in progress.verified) continue
      if (outOfTime()) break
      try {
        progress.verified[name] = (await L.digest(await readFile(path('check', name)))) === progress.files[name].sha
      } catch {
        progress.verified[name] = false
      }
    }
    await save()
    const checked = saved.filter((name) => name in progress.verified)
    return JSON.stringify({
      phase,
      verified: checked.filter((name) => progress.verified[name]).length,
      wrong: checked.filter((name) => !progress.verified[name]).map(code),
      remaining: saved.length - checked.length,
    })
  }
  return JSON.stringify({ error: `unknown phase ${phase}` })
}
