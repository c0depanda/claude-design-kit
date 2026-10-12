// Deterministic design-file toolkit. The same file runs locally (run-local.mjs, run-pack-local.mjs) and in Claude
// Design's run_script sandbox:
//   const L = eval(await readFile('uploads/kit-link.js'))
// It never reads the network and needs no imports, and every step reports SHA-256 fingerprints so both runs can be
// compared. Where the component library matters (linkLibrary, applyRewrites), it takes a library description
// { stylesheets: [...], screenClass } and defaults to the example library (prefix hx) the templates use.
(() => {
  const DEFAULT_LIBRARY = {
    stylesheets: ['components/hx-tokens.css', 'components/hx.css'],
    screenClass: 'hx-screen',
  }

  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
    0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
    0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
    0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
    0xc67178f2,
  ])

  // TextEncoder where the sandbox has it; the same UTF-8 bytes by hand where it doesn't.
  function utf8(text) {
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(text)
    const bytes = []
    for (const character of text) {
      const code = character.codePointAt(0)
      if (code < 0x80) bytes.push(code)
      else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63))
      else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63))
      else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63))
    }
    return Uint8Array.from(bytes)
  }

  function sha256(text) {
    const data = utf8(text)
    const bitLength = data.length * 8
    const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6)
    padded.set(data)
    padded[data.length] = 0x80
    const view = new DataView(padded.buffer)
    view.setUint32(padded.length - 8, Math.floor(bitLength / 2 ** 32))
    view.setUint32(padded.length - 4, bitLength >>> 0)
    const h = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ])
    const w = new Uint32Array(64)
    const rotate = (x, n) => (x >>> n) | (x << (32 - n))
    for (let offset = 0; offset < padded.length; offset += 64) {
      for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4)
      for (let i = 16; i < 64; i++) {
        const s0 = rotate(w[i - 15], 7) ^ rotate(w[i - 15], 18) ^ (w[i - 15] >>> 3)
        const s1 = rotate(w[i - 2], 17) ^ rotate(w[i - 2], 19) ^ (w[i - 2] >>> 10)
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
      }
      let [a, b, c, d, e, f, g, hh] = h
      for (let i = 0; i < 64; i++) {
        const t1 = (hh + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0
        const t2 = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0
        hh = g
        g = f
        f = e
        e = (d + t1) >>> 0
        d = c
        c = b
        b = a
        a = (t1 + t2) >>> 0
      }
      h[0] += a
      h[1] += b
      h[2] += c
      h[3] += d
      h[4] += e
      h[5] += f
      h[6] += g
      h[7] += hh
    }
    return Array.from(h, (x) => x.toString(16).padStart(8, '0')).join('')
  }

  // The platform's SHA-256 where the sandbox has one (much faster on large files); the same digest by hand otherwise.
  async function digest(text) {
    const subtle = typeof crypto === 'object' && crypto && crypto.subtle
    if (subtle && typeof subtle.digest === 'function') {
      try {
        const buffer = await subtle.digest('SHA-256', utf8(text))
        return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('')
      } catch {}
    }
    return sha256(text)
  }

  const EXTERNAL = /^(#|https?:|data:|mailto:|tel:|javascript:|blob:|about:)/i

  // Local paths a file depends on: attributes, CSS url(), and script loads (readFile/fetch/import).
  function localReferences(text) {
    const found = new Set()
    const patterns = [
      /\s(?:src|href|content|poster|data-src)\s*=\s*"([^"]+)"/g,
      /url\(\s*['"]?([^'")]+)['"]?\s*\)/g,
      /(?:readFile|fetch|import)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /\bfrom\s+['"]([^'"]+)['"]/g,
    ]
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const value = match[1].trim().replace(/^\.\//, '')
        if (!value || EXTERNAL.test(value) || /\s/.test(value) || !/[./]/.test(value)) continue
        if (/^(width=|text\/|IE=|noindex)/.test(value)) continue
        found.add(decodeURIComponent(value.split(/[?#]/)[0]))
      }
    }
    return [...found].sort()
  }

  function count(text, pattern) {
    let total = 0
    for (const _ of text.matchAll(pattern)) total++
    return total
  }

  // One line per canonical file: fingerprint plus the structure the relink will change.
  async function census({ readFile, files }) {
    const rows = []
    for (const name of files) {
      const text = await readFile(name)
      const classes = new Set()
      for (const match of text.matchAll(/\sclass\s*=\s*"([^"]*)"/g)) for (const c of match[1].split(/\s+/)) if (c) classes.add(c)
      let styleBytes = 0
      for (const match of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) styleBytes += match[1].length
      rows.push({
        file: name,
        sha256: await digest(text),
        characters: text.length,
        frames: count(text, /\sdata-screen-label\s*=\s*"/g),
        classes: classes.size,
        inlineStyles: count(text, /\sstyle\s*=\s*"/g),
        hexColours: count(text, /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F-])/g),
        styleBlockCharacters: styleBytes,
        references: localReferences(text),
      })
    }
    return rows
  }

  // A file list's combined fingerprint, so one line can confirm a whole step.
  function combined(rows) {
    return digest(rows.map((row) => `${row.file}\t${row.sha256}`).join('\n'))
  }

  async function readText(readFile, name) {
    try {
      const text = await readFile(name)
      return typeof text === 'string' ? text : null
    } catch {
      return null
    }
  }

  // Compares the project with the fingerprints taken from the local export. Prints only differences.
  async function verify({ readFile, expected }) {
    const mismatched = []
    const missing = []
    const rows = []
    for (const want of expected.files) {
      const text = await readText(readFile, want.file)
      if (text === null) {
        missing.push(want.file)
        continue
      }
      const sha = await digest(text)
      rows.push({ file: want.file, sha256: sha })
      if (sha !== want.sha256) mismatched.push(want.file)
    }
    const unresolved = []
    for (const reference of expected.textReferences) {
      if ((await readText(readFile, reference)) === null) unresolved.push(reference)
    }
    const all = await combined(rows)
    const ok = !mismatched.length && !missing.length && !unresolved.length && all === expected.combined
    return { ok, checked: expected.files.length, combined: all, mismatched, missing, unresolved, files: rows }
  }

  // Paths that should be gone after a cleanup; returns the ones still readable.
  async function present({ readFile, paths }) {
    const found = []
    for (const name of paths) if ((await readText(readFile, name)) !== null) found.push(name)
    return found
  }

  // Labelled frame spans: every element carrying data-screen-label, from its start tag to its end tag.
  const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '))
  const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
  function frameSpans(source) {
    const frames = []
    const stack = []
    for (const m of source.matchAll(TAG)) {
      const tag = m[2].toLowerCase()
      if (VOID.has(tag)) continue
      if (m[1] !== '/') {
        const label = /data-screen-label\s*=\s*"([^"]*)"/.exec(m[3] || '')
        const marker = label ? { label: label[1], start: m.index } : null
        if (m[4] === '/') {
          if (marker) frames.push({ ...marker, end: m.index + m[0].length })
        } else stack.push({ tag, marker })
      } else {
        let i = stack.length - 1
        while (i >= 0 && stack[i].tag !== tag) i--
        if (i < 0) continue
        const { marker } = stack[i]
        stack.length = i
        if (marker) frames.push({ ...marker, end: m.index + m[0].length })
      }
    }
    return frames.sort((a, b) => a.start - b.start)
  }

  const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  const decode = (value) =>
    value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name) =>
      name[0] === '#'
        ? String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1)))
        : (ENTITIES[name.toLowerCase()] ?? whole),
    )

  // The first value of an attribute, decoded as the browser reads it (getAttribute).
  function attribute(raw, name) {
    for (const a of raw.matchAll(/\s([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g))
      if (a[1].toLowerCase() === name) return decode(a[2] ?? a[3] ?? a[4] ?? '')
    return null
  }

  // A tag whose attributes don't parse cleanly (a stray quote, say) is read differently by a browser; leave it alone.
  const ATTRIBUTE = /\s+[^\s"'=<>/`]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g
  const wellFormed = (raw) => raw.replace(ATTRIBUTE, '').trim() === ''

  // Regions whose contents are not elements: comments, scripts, styles, templates and textareas.
  function opaqueRegions(source) {
    const regions = []
    for (const m of source.matchAll(/<!--[\s\S]*?-->|<(script|style|template|textarea)\b[^>]*>[\s\S]*?<\/\1\s*>/gi))
      regions.push([m.index, m.index + m[0].length])
    return regions
  }

  // Adds data-component attributes to every element whose (tag, class, style) pattern has a mark, inside frames only.
  // marks: { "<tag>|<class>|<style>": { "data-component": "HxButton", "data-component-variant": "primary", … } }
  // With allowExisting, elements that already carry data-component keep exactly what they have.
  function applyMarks(source, marks, protectedLabel, { allowExisting = false } = {}) {
    if (!allowExisting && source.includes('data-component')) throw new Error('file already carries data-component attributes')
    const skip = protectedLabel ? new RegExp(protectedLabel) : null
    const frames = frameSpans(source)
    const opaque = opaqueRegions(source)
    const parts = []
    let last = 0
    let frame = 0
    let region = 0
    let marked = 0
    for (const m of source.matchAll(TAG)) {
      if (m[1] === '/') continue
      const at = m.index
      while (region < opaque.length && opaque[region][1] <= at) region++
      if (region < opaque.length && opaque[region][0] < at) continue
      while (frame < frames.length && frames[frame].end <= at) frame++
      // Frames never nest, so the first span ending after this tag is the only one that can hold it.
      const holder = frames[frame]
      if (!holder || holder.start >= at || (skip && skip.test(holder.label))) continue
      const tag = m[2].toLowerCase()
      const raw = m[3] || ''
      const key = `${tag}|${attribute(raw, 'class') ?? ''}|${attribute(raw, 'style') ?? ''}`
      const mark = marks[key]
      if (!mark || /\sdata-component\s*=/.test(raw) || !wellFormed(raw)) continue
      const insertAt = at + m[0].length - (m[4] === '/' ? 2 : 1)
      parts.push(source.slice(last, insertAt))
      for (const [name, value] of Object.entries(mark)) parts.push(` ${name}="${value}"`)
      last = insertAt
      marked++
    }
    parts.push(source.slice(last))
    return { text: parts.join(''), marked }
  }

  // Removing every data-component attribute must give back the original file exactly.
  const unmark = (text) => text.replace(/ data-component(?:-[a-z]+)?="[^"]*"/g, '')

  // Style declarations, split outside parentheses and quotes, with lower-case property names.
  function declarations(style) {
    const out = []
    let depth = 0
    let quote = null
    let start = 0
    const push = (end) => {
      const part = style.slice(start, end).trim()
      const colon = part.indexOf(':')
      if (colon > 0) out.push([part.slice(0, colon).trim().toLowerCase(), part.slice(colon + 1).trim()])
    }
    for (let i = 0; i < style.length; i++) {
      const c = style[i]
      if (quote) {
        if (c === quote) quote = null
      } else if (c === '"' || c === "'") quote = c
      else if (c === '(') depth++
      else if (c === ')') depth--
      else if (c === ';' && depth === 0) {
        push(i)
        start = i + 1
      }
    }
    push(style.length)
    return out
  }
  const encodeAttribute = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

  // Sets one attribute in a raw tag's attribute text: replaces the first occurrence, or appends it; null removes it.
  function setAttribute(raw, name, value) {
    const pattern = new RegExp(`\\s${name}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>"']+)`, 'i')
    const found = pattern.exec(raw)
    if (value === null) return found ? raw.slice(0, found.index) + raw.slice(found.index + found[0].length) : raw
    const next = ` ${name}="${encodeAttribute(value)}"`
    if (found) return raw.slice(0, found.index) + next + raw.slice(found.index + found[0].length)
    const trailing = raw.match(/\s*\/?\s*$/)[0]
    return raw.slice(0, raw.length - trailing.length) + next + trailing
  }

  // Links the library's stylesheets into a file once, at the end of <helmet>. A file that already links the last one
  // (the components stylesheet) is left as it is.
  function linkLibrary(source, library = DEFAULT_LIBRARY) {
    const sheets = library.stylesheets
    if (source.includes(sheets[sheets.length - 1])) return source
    const close = source.indexOf('</helmet>')
    if (close < 0 || source.indexOf('</helmet>', close + 1) >= 0) throw new Error('expected exactly one </helmet>')
    const links = sheets.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n')
    return source.slice(0, close) + links + '\n' + source.slice(close)
  }

  // Gives every element of a rewritten pattern its library classes (and data-state), and drops the inline style
  // properties the library now sets. rewrites: { "<tag>|<class>|<style>": { add: "hx-button …", remove: [...], state } }
  function applyRewrites(source, rewrites, protectedLabel, library = DEFAULT_LIBRARY) {
    const screenClass = library.screenClass
    const skip = protectedLabel ? new RegExp(protectedLabel) : null
    const linked = linkLibrary(source, library)
    const frames = frameSpans(linked)
    const opaque = opaqueRegions(linked)
    const parts = []
    let last = 0
    let frame = 0
    let region = 0
    let rewritten = 0
    for (const m of linked.matchAll(TAG)) {
      if (m[1] === '/') continue
      const at = m.index
      while (region < opaque.length && opaque[region][1] <= at) region++
      if (region < opaque.length && opaque[region][0] < at) continue
      while (frame < frames.length && frames[frame].end <= at) frame++
      const holder = frames[frame]
      if (!holder || (skip && skip.test(holder.label))) continue
      const raw = m[3] || ''
      if (!wellFormed(raw)) continue
      const tag = m[2].toLowerCase()
      const classes = attribute(raw, 'class')
      const style = attribute(raw, 'style')
      // A frame drawn at a fixed width becomes a size container, so the library's width tiers apply inside it.
      // Frames sized by their content are left alone: containment would collapse them.
      if (holder.start === at) {
        const width = declarations(style ?? '').find(([prop]) => prop === 'width')
        if (width && /^\d+(\.\d+)?px$/.test(width[1]) && !(classes ?? '').split(/\s+/).includes(screenClass)) {
          parts.push(linked.slice(last, at), `<${m[2]}${setAttribute(raw, 'class', [classes, screenClass].filter(Boolean).join(' '))}${m[4] === '/' ? '/' : ''}>`)
          last = at + m[0].length
        }
        continue
      }
      const rule = rewrites[`${tag}|${classes ?? ''}|${style ?? ''}`]
      if (!rule) continue
      let next = setAttribute(raw, 'class', [classes, rule.add].filter(Boolean).join(' '))
      if (style !== null) {
        const kept = declarations(style).filter(([prop]) => !rule.remove.includes(prop))
        next = setAttribute(next, 'style', kept.length ? kept.map(([p, v]) => `${p}:${v}`).join(';') : null)
      }
      if (rule.state) next = setAttribute(next, 'data-state', rule.state)
      parts.push(linked.slice(last, at), `<${m[2]}${next}${m[4] === '/' ? '/' : ''}>`)
      last = at + m[0].length
      rewritten++
    }
    parts.push(linked.slice(last))
    return { text: parts.join(''), rewritten }
  }

  // A part's marks as one string: the component, then its other data-component attributes sorted by name.
  function marksOf(raw) {
    let component = null
    const rest = []
    for (const a of raw.matchAll(/\sdata-component(?:-([a-z]+))?\s*=\s*"([^"]*)"/g)) {
      if (a[1] === undefined) component = a[2]
      else rest.push(`${a[1]}=${a[2]}`)
    }
    return component === null ? null : [component, ...rest.sort()].join(' ')
  }
  const MARK_ORDER = ['variant', 'size', 'kind', 'tone', 'state', 'part', 'shape', 'surface', 'name']

  // Corrects the marks of listed parts. remarks: { "<tag>|<class>|<style>\u0001<marks>": entry } (<marks> is "null" for
  // a tag without marks, which a re-mark can mark), where an entry is
  //   { count, all: change } for every part with that key and those marks, or { count, at: { "<n>": change } } for the
  //   n-th of them (counted from 0 in document order, inside frames), with probe: { "<n>": "<digest of the 160
  //   characters after its tag>" } so a part is never confused with a look-alike of the same pattern.
  // A change is { to: { "data-component": …, "data-component-part": … } | null, set?: { class, style, state } }:
  // the old marks go, the new ones are written after the other attributes, and set replaces the class or style or
  // sets data-state (null removes it). Every entry's count must match, or nothing is returned.
  // Every marked tag inside a frame, in document order: { id: "<tag>|<class>|<style>\u0001<marks>", at, end, m }. With
  // all, unmarked tags too (their marks read "null").
  function markedParts(source, protectedLabel, all = false) {
    const skip = protectedLabel ? new RegExp(protectedLabel) : null
    const frames = frameSpans(source)
    const opaque = opaqueRegions(source)
    const out = []
    let frame = 0
    let region = 0
    for (const m of source.matchAll(TAG)) {
      if (m[1] === '/') continue
      const at = m.index
      while (region < opaque.length && opaque[region][1] <= at) region++
      if (region < opaque.length && opaque[region][0] < at) continue
      while (frame < frames.length && frames[frame].end <= at) frame++
      const holder = frames[frame]
      if (!holder || holder.start >= at || (skip && skip.test(holder.label))) continue
      const raw = m[3] || ''
      if ((!all && !/\sdata-component\s*=/.test(raw)) || !wellFormed(raw)) continue
      out.push({ id: `${m[2].toLowerCase()}|${attribute(raw, 'class') ?? ''}|${attribute(raw, 'style') ?? ''}\u0001${marksOf(raw)}`, at, end: at + m[0].length, m })
    }
    return out
  }

  async function applyRemarks(source, remarks, protectedLabel) {
    const seen = {}
    const parts = []
    let last = 0
    let changed = 0
    // Unmarked tags are walked only when a listed pattern is unmarked; the order of each pattern is the same either way.
    const all = Object.keys(remarks).some((id) => id.endsWith('\u0001null'))
    for (const { id, at, end, m } of markedParts(source, protectedLabel, all)) {
      const entry = remarks[id]
      if (!entry) continue
      const n = (seen[id] = (seen[id] ?? -1) + 1)
      const change = entry.all ?? entry.at?.[n]
      if (!change) continue
      if (entry.probe?.[n] !== undefined && (await digest(source.slice(end, end + 160))).slice(0, 16) !== entry.probe[n])
        throw new Error(`part ${n} of a listed pattern is not the verified one`)
      let next = (m[3] || '').replace(/\s+data-component(?:-[a-z]+)?\s*=\s*"[^"]*"/g, '')
      if (change.set && 'class' in change.set) next = setAttribute(next, 'class', change.set.class)
      if (change.set && 'style' in change.set) next = setAttribute(next, 'style', change.set.style)
      if (change.set && 'state' in change.set) next = setAttribute(next, 'data-state', change.set.state)
      const trailing = next.match(/\s*\/?\s*$/)[0]
      let marks = ''
      if (change.to) {
        marks += ` data-component="${change.to['data-component']}"`
        for (const k of MARK_ORDER) if (change.to[`data-component-${k}`]) marks += ` data-component-${k}="${change.to[`data-component-${k}`]}"`
      }
      next = next.slice(0, next.length - trailing.length) + marks + trailing
      parts.push(source.slice(last, at), `<${m[2]}${next}${m[4] === '/' ? '/' : ''}>`)
      last = end
      changed++
    }
    parts.push(source.slice(last))
    for (const [id, entry] of Object.entries(remarks)) {
      const found = (seen[id] ?? -1) + 1
      if (found !== entry.count) throw new Error(`expected ${entry.count} parts of a listed pattern, found ${found}`)
    }
    return { text: parts.join(''), changed }
  }

  // Proof that a re-mark changed nothing else: the two texts hold the same tags and the same text between them, and
  // each tag is the same once its marks are removed, apart from class, style and data-state on the tags that changed.
  function proveRemarks(before, after) {
    const tags = (text) => [...text.matchAll(TAG)]
    const a = tags(before)
    const b = tags(after)
    if (a.length !== b.length) return { ok: false, reason: 'tag count differs' }
    const strip = (raw) => raw.replace(/\s+data-component(?:-[a-z]+)?\s*=\s*"[^"]*"/g, '')
    const loose = (raw) => strip(raw).replace(/\s(?:class|style|data-state)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+)/g, '')
    let lastA = 0
    let lastB = 0
    let touched = 0
    for (let i = 0; i < a.length; i++) {
      if (before.slice(lastA, a[i].index) !== after.slice(lastB, b[i].index)) return { ok: false, reason: `text differs before tag ${i}` }
      lastA = a[i].index + a[i][0].length
      lastB = b[i].index + b[i][0].length
      if (a[i][0] === b[i][0]) continue
      if (a[i][2] !== b[i][2] || a[i][1] !== b[i][1]) return { ok: false, reason: `tag ${i} differs` }
      const ra = a[i][3] || ''
      const rb = b[i][3] || ''
      if (strip(ra) === strip(rb)) {
        touched++
        continue
      }
      if (loose(ra) !== loose(rb)) return { ok: false, reason: `tag ${i} changed more than its marks, class, style and data-state` }
      touched++
    }
    if (before.slice(lastA) !== after.slice(lastB)) return { ok: false, reason: 'text differs after the last tag' }
    return { ok: true, touched }
  }

  return { defaultLibrary: DEFAULT_LIBRARY, sha256, digest, localReferences, census, combined, verify, present, frameSpans, attribute, applyMarks, unmark, applyRewrites, linkLibrary, declarations, marksOf, markedParts, applyRemarks, proveRemarks }
})()
