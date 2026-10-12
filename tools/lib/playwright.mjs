// Finds Playwright for the kit's browser tools, so no tool hard-codes where it is installed.
// PLAYWRIGHT_MODULE may name playwright's index.js, playwright's package folder, or a project folder whose
// node_modules holds it. Without it, Playwright is resolved from the current folder, then from the kit's tools folder.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const tools = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function candidates() {
  const list = []
  const given = process.env.PLAYWRIGHT_MODULE
  if (given) {
    const target = path.resolve(given)
    if (fs.existsSync(target) && fs.statSync(target).isFile()) return [target]
    const own = path.join(target, 'package.json')
    if (fs.existsSync(own) && JSON.parse(fs.readFileSync(own, 'utf8')).name === 'playwright') return [path.join(target, 'index.js')]
    list.push(target)
  }
  list.push(process.cwd(), tools)
  const found = []
  for (const base of list) {
    try {
      found.push(createRequire(path.join(base, 'noop.js')).resolve('playwright'))
    } catch {}
  }
  return found
}

export async function loadPlaywright() {
  const [entry] = candidates()
  if (!entry || !fs.existsSync(entry)) {
    console.error(
      'Playwright not found. Set PLAYWRIGHT_MODULE to playwright/index.js inside a project that has it ' +
        '(for example <app>/node_modules/playwright/index.js), or run `npm install` and ' +
        `\`npx playwright install chromium\` in ${tools}.`,
    )
    process.exit(1)
  }
  const module = await import(pathToFileURL(entry).href)
  return module.chromium ? module : module.default
}
