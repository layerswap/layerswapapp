import assert from 'node:assert/strict'
import test from 'node:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Guard for the class of bug where a reader of the resolved swap status feeds the resolver
// a private input (a local tx-status poll, a gasless flag) and reports a different phase than
// the panel the user sees. The status is computed once in context/swap.tsx; everything else
// reads it through the zero-arity useResolvedSwapStatus().
const srcDir = new URL('../src/', import.meta.url).pathname

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) yield* sourceFiles(path)
    else if (/\.tsx?$/.test(entry)) yield path
  }
}

const sources = [...sourceFiles(srcDir)].map(path => ({ path: relative(srcDir, path), text: readFileSync(path, 'utf8') }))

function filesContaining(pattern) {
  return sources.filter(({ text }) => pattern.test(text)).map(({ path }) => path).sort()
}

test('the source tree is scanned', () => {
  assert(sources.length > 100)
  assert(sources.some(({ path }) => path === 'context/swap.tsx'))
})

test('every useResolvedSwapStatus caller passes no inputs', () => {
  const offenders = []
  for (const { path, text } of sources) {
    for (const match of text.matchAll(/useResolvedSwapStatus\(([^)]*)\)/g)) {
      if (match[1].trim() !== '') offenders.push(`${path}: ${match[0]}`)
    }
  }
  assert.deepEqual(offenders, [])
  assert(filesContaining(/useResolvedSwapStatus\(\)/).length >= 5)
})

test('live status is resolved only by the provider; the isolated preview resolves synthetic snapshots', () => {
  assert.deepEqual(filesContaining(/\bresolveSwapPhase\(/), [
    'components/Pages/Swap/Withdraw/Presentation/Page2Preview.tsx',
    'components/utils/resolveSwapPhase.ts',
    'context/swap.tsx',
  ])
})

test('the input tx-status poll lives only in SwapDataProvider', () => {
  assert.deepEqual(filesContaining(/\bGetTransactionStatus\(/), ['context/swap.tsx', 'lib/apiClients/layerSwapApiClient.ts'])
})

test('the gasless authorization outcome is observed once, in SwapDataProvider', () => {
  assert.deepEqual(filesContaining(/\buseGaslessAuthorization\(/), ['context/swap.tsx', 'hooks/useGaslessAuthorization.ts'])
})

test('flow_closed is built only by resolveFlowClosedEvent', () => {
  assert.deepEqual(filesContaining(/step: 'flow_closed'/), ['lib/swapLifecycle.ts'])
})
