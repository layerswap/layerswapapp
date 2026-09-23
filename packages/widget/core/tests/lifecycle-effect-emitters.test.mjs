import assert from 'node:assert/strict'
import test from 'node:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Guard for the class of bug where an effect re-reports a phase because enrichment
// (swap id, source address, confirmation count) arrived later. Effect-driven lifecycle
// observations go through hooks/useLifecycleObservation, which is keyed on the shared
// observation fingerprint; a plain effect calling onSwapLifecycle needs an allowlist entry.
const srcDir = new URL('../src/', import.meta.url).pathname
const EXCLUDED = new Set(['hooks/useTransferBlocked.ts', 'hooks/useLifecycleObservation.ts'])
const ALLOWLIST = new Set([
  // Once per hash by design: its deps exclude `status`, and the fingerprint contains it.
  'components/Pages/Swap/Withdraw/Processing/Processing.tsx#input_transaction_detected',
])
const EFFECT_HOOKS = /\b(useEffect|useClientLayoutEffect|useLayoutEffect)\s*\(/g

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) yield* sourceFiles(path)
    else if (/\.tsx?$/.test(entry)) yield path
  }
}

/** Returns the text between the hook's opening paren and its matching close. */
function effectBody(text, openIndex) {
  let depth = 0
  for (let i = openIndex; i < text.length; i++) {
    const char = text[i]
    if (char === '(') depth++
    else if (char === ')' && --depth === 0) return text.slice(openIndex + 1, i)
  }
  throw new Error(`Unbalanced parentheses after index ${openIndex}`)
}

function effectEmitters() {
  const found = new Set()
  for (const path of sourceFiles(srcDir)) {
    const file = relative(srcDir, path)
    if (EXCLUDED.has(file)) continue
    const text = readFileSync(path, 'utf8')
    for (const match of text.matchAll(EFFECT_HOOKS)) {
      const body = effectBody(text, match.index + match[0].length - 1)
      if (!body.includes('onSwapLifecycle(')) continue
      const steps = [...body.matchAll(/step:\s*'([a-z_]+)'/g)].map(m => m[1])
      if (steps.length === 0) steps.push('<dynamic step>')
      for (const step of steps) found.add(`${file}#${step}`)
    }
  }
  return found
}

test('the source tree is scanned', () => {
  const files = [...sourceFiles(srcDir)].map(path => relative(srcDir, path))
  assert(files.length > 100)
  assert(files.includes('hooks/useLifecycleObservation.ts'))
  assert(files.includes('components/Pages/Swap/Withdraw/Processing/Processing.tsx'))
})

test('effect-driven lifecycle observations go through useLifecycleObservation', () => {
  const found = effectEmitters()
  const unexpected = [...found].filter(entry => !ALLOWLIST.has(entry)).sort()
  const stale = [...ALLOWLIST].filter(entry => !found.has(entry)).sort()
  assert.deepEqual(unexpected, [], [
    'onSwapLifecycle is called from a React effect. Late context (swap id, address, confirmations)',
    'would re-emit the observation; use hooks/useLifecycleObservation (fingerprint-keyed) instead,',
    'or add a justified allowlist entry in tests/lifecycle-effect-emitters.test.mjs.',
  ].join(' '))
  assert.deepEqual(stale, [], 'allowlisted effect emitters that no longer exist should be removed from the allowlist')
})
