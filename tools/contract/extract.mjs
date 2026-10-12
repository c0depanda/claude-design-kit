// Reads one rendered screen into a small, comparable spec: every visible text run with its box and type, and the
// bordered or filled boxes ("panels") that hold them. The same function runs on a Claude Design frame and on the
// app, so both sides are measured the same way. Runs inside the page (page.evaluate), so its patterns arrive as
// strings: partPattern names the classes of design-system parts (default: hx- classes), and utilityPattern, if
// given, the classes that look like parts but aren't (utility classes).
export function extractScreen({ rootSelector, rootId, shellLabels, partPattern = '^hx-[a-z]', utilityPattern = null }) {
  const partClass = new RegExp(partPattern)
  const utilityClass = utilityPattern ? new RegExp(utilityPattern) : null
  const root = rootId ? document.getElementById(rootId) : document.querySelector(rootSelector)
  if (!root) return null
  const frame = root.getBoundingClientRect()
  // A design frame draws a 1px border around the screen; the app's document has none.
  const border = rootId ? parseFloat(getComputedStyle(root).borderLeftWidth) || 0 : 0
  const ox = frame.left + border + (rootId ? 0 : window.scrollX)
  const oy = frame.top + border + (rootId ? 0 : window.scrollY)
  const transparent = (c) => !c || c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c)
  const visible = (el) => {
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false
    const cs = getComputedStyle(el)
    if (/inset\(50%/.test(cs.clipPath) || cs.clip.startsWith('rect(0')) return false
    const r = el.getBoundingClientRect()
    return r.width > 1 && r.height > 1
  }
  const boxes = []
  const boxOf = new Map()
  const panelFor = (el) => {
    for (let node = el; node && node !== root.parentElement; node = node.parentElement) {
      if (boxOf.has(node)) return boxOf.get(node)
      const cs = getComputedStyle(node)
      const r = node.getBoundingClientRect()
      const bordered = ['Top', 'Right', 'Bottom', 'Left'].filter((side) => parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none').length >= 3
      const filled = !transparent(cs.backgroundColor) && node.parentElement && cs.backgroundColor !== getComputedStyle(node.parentElement).backgroundColor
      if ((bordered || filled) && r.width >= 160 && r.height >= 36 && node !== root) {
        const id = boxes.length
        boxes.push({ id, x: Math.round(r.left - ox), y: Math.round(r.top - oy), w: Math.round(r.width), h: Math.round(r.height), radius: cs.borderTopLeftRadius, bg: cs.backgroundColor, border: bordered ? cs.borderTopColor : null })
        boxOf.set(node, id)
        return id
      }
    }
    return null
  }
  const texts = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const raw = node.textContent.replace(/\s+/g, ' ').trim()
    const el = node.parentElement
    if (!raw || !el || !visible(el)) continue
    if (el.closest('script, style, noscript, [aria-hidden="true"] svg')) continue
    const range = document.createRange()
    range.selectNodeContents(node)
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
    if (!rects.length) continue
    const left = Math.min(...rects.map((r) => r.left)), top = Math.min(...rects.map((r) => r.top))
    const right = Math.max(...rects.map((r) => r.right)), bottom = Math.max(...rects.map((r) => r.bottom))
    const cs = getComputedStyle(el)
    const shown = cs.textTransform === 'uppercase' ? raw.toUpperCase() : cs.textTransform === 'lowercase' ? raw.toLowerCase() : raw
    texts.push({
      text: shown,
      x: Math.round(left - ox), y: Math.round(top - oy), w: Math.round(right - left), h: Math.round(bottom - top),
      size: cs.fontSize, weight: cs.fontWeight, line: cs.lineHeight, color: cs.color, family: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
      tag: el.tagName.toLowerCase(), role: el.closest('button, [role="button"]') ? 'button' : el.closest('a[href]') ? 'link' : el.closest('h1, h2, h3') ? el.closest('h1, h2, h3').tagName.toLowerCase() : '',
      panel: panelFor(el),
      // The design-system part that drew it, so a difference can be traced to one component.
      part: (() => {
        for (let n = el; n && n !== root; n = n.parentElement) {
          const c = [...(n.classList ?? [])].find((name) => partClass.test(name) && !(utilityClass && utilityClass.test(name)))
          if (c) return c
        }
        return ''
      })(),
    })
  }
  // The app header and navigation are the shared shell, owned by its own design file and compared elsewhere.
  const navRow = texts.filter((t) => shellLabels.includes(t.text) && t.y < 140)
  const shellBottom = navRow.length ? Math.max(...navRow.map((t) => t.y + t.h)) + 8 : 0
  return { width: Math.round(frame.width - 2 * border), height: Math.round(frame.height - 2 * border), border, shellBottom, texts, boxes }
}
