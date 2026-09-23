import assert from 'node:assert/strict'
import test, { after, afterEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { readFileSync } from 'node:fs'
import { getErrorOccurrenceId, setErrorLogger } from '@layerswap/widget-types'

// The widget emits extensionless relative imports for bundlers; resolve those in Node.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
      return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
  },
})
after(() => hooks.deregister())

const { createSwapAttempt, requestSwap, announceCreatedSwap } = await import('../dist/esm/lib/swapCreation.js')
const { lifecycleErrorDetails } = await import('../dist/esm/lib/swapLifecycle.js')
const { registerWidgetErrorLogger } = await import('../dist/esm/lib/ErrorHandler.js')

afterEach(() => registerWidgetErrorLogger())

const swap = { swap: { id: 'swap-1', source_address: '0xsource', status: 'created' }, quote: {} }
const lifecycleContext = { depositMethod: 'wallet', requestedAmount: '1', sourceNetwork: 'A', destinationNetwork: 'B' }

function harness({ useGasless = false, request = async () => ({ data: swap }), onCreated = [], prepare } = {}) {
  const lifecycle = []
  const reported = []
  let gaslessUnavailable = 0
  setErrorLogger(event => reported.push(event))
  const attempt = createSwapAttempt(
    prepare ?? (async () => ({ request, useGasless, onCreated })),
    {
      path: 'test.createSwap',
      lifecycleContext,
      onLifecycle: event => lifecycle.push(event),
      onGaslessUnavailable: () => { gaslessUnavailable++ },
    },
  )
  return { attempt, lifecycle, reported, steps: () => lifecycle.map(e => e.step), gaslessUnavailable: () => gaslessUnavailable }
}

test('a created swap emits started then created, runs the effects in order and resolves', async () => {
  const calls = []
  const h = harness({
    onCreated: [
      { name: 'onSwapCreate', run: s => calls.push(['onSwapCreate', s]) },
      { name: 'recentRoutes.updateRecentNetworks', run: () => calls.push(['recent']) },
    ],
  })
  assert.equal(await h.attempt, swap)
  assert.deepEqual(h.steps(), ['swap_creation_started', 'swap_created'])
  assert.deepEqual(h.lifecycle[0], { step: 'swap_creation_started', outcome: 'started', stage: 'swap_creation', path: 'test.createSwap', ...lifecycleContext })
  assert.deepEqual(h.lifecycle[1], {
    step: 'swap_created', outcome: 'succeeded', stage: 'swap_creation', path: 'test.createSwap', ...lifecycleContext,
    swapId: 'swap-1', fromAddress: '0xsource', status: 'created',
  })
  assert.deepEqual(calls, [['onSwapCreate', swap], ['recent']])
  assert.equal(h.gaslessUnavailable(), 0)
  assert.deepEqual(h.reported, [])
})

test('a rejected use_gasless request declares gasless unavailable and fails the attempt with the same error', async () => {
  const error = Object.assign(new Error('Request failed'), { response: { data: { error: { code: 'GASLESS_NOT_SUPPORTED', message: 'no gasless' } } } })
  const h = harness({ useGasless: true, request: async () => { throw error } })
  await assert.rejects(h.attempt, caught => caught === error)
  assert.deepEqual(h.steps(), ['swap_creation_started', 'swap_creation_failed'])
  assert.deepEqual(h.lifecycle[1], { step: 'swap_creation_failed', outcome: 'failed', stage: 'swap_creation', path: 'test.createSwap', ...lifecycleErrorDetails(error), ...lifecycleContext })
  assert.equal(h.lifecycle[1].reasonCode, 'GASLESS_NOT_SUPPORTED')
  assert.equal(h.gaslessUnavailable(), 1)
})

test('an error envelope on a use_gasless request declares gasless unavailable and rejects with that error', async () => {
  const apiError = { code: 'INSUFFICIENT_LIQUIDITY', message: 'Not enough liquidity' }
  const h = harness({ useGasless: true, request: async () => ({ error: apiError }) })
  await assert.rejects(h.attempt, caught => caught === apiError)
  assert.deepEqual(h.steps(), ['swap_creation_started', 'swap_creation_failed'])
  assert.equal(h.gaslessUnavailable(), 1)
})

test('the same request failures without use_gasless do not touch the gasless flag', async () => {
  const h = harness({ useGasless: false, request: async () => { throw new Error('Network down') } })
  await assert.rejects(h.attempt, /Network down/)
  assert.deepEqual(h.steps(), ['swap_creation_started', 'swap_creation_failed'])
  assert.equal(h.gaslessUnavailable(), 0)
})

test('a 2xx without a swap id fails the attempt but is not a gasless refusal', async () => {
  const h = harness({ useGasless: true, request: async () => ({ data: { swap: {} } }) })
  await assert.rejects(h.attempt, /Could not create swap/)
  assert.deepEqual(h.steps(), ['swap_creation_started', 'swap_creation_failed'])
  assert.equal(h.lifecycle[1].reason, 'Could not create swap')
  assert.equal(h.gaslessUnavailable(), 0)
})

test('a failure while preparing the request is terminal but never sends the request or flips gasless', async () => {
  const error = new Error('RPC unavailable')
  const h = harness({ prepare: async () => { throw error } })
  await assert.rejects(h.attempt, caught => caught === error)
  assert.deepEqual(h.steps(), ['swap_creation_started', 'swap_creation_failed'])
  assert.equal(h.lifecycle[1].reason, 'RPC unavailable')
  assert.equal(h.lifecycle[1].occurrenceId, getErrorOccurrenceId(error))
  assert.equal(h.gaslessUnavailable(), 0)
})

test('a throwing post-creation effect is reported as SideEffectError and neither fails the attempt nor skips later effects', async () => {
  const quota = Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' })
  const calls = []
  const h = harness({
    useGasless: true,
    onCreated: [
      { name: 'onSwapCreate', run: () => calls.push('onSwapCreate') },
      { name: 'extendedRoutes.setRecord', run: () => { throw quota } },
      { name: 'recentRoutes.updateRecentNetworks', run: () => calls.push('recent') },
    ],
  })
  assert.equal(await h.attempt, swap)
  assert.deepEqual(h.steps(), ['swap_creation_started', 'swap_created'])
  assert.deepEqual(calls, ['onSwapCreate', 'recent'])
  assert.equal(h.gaslessUnavailable(), 0)
  assert.equal(h.reported.length, 1)
  const [event] = h.reported
  assert.equal(event.type, 'SideEffectError')
  assert.equal(event.operation, 'extendedRoutes.setRecord')
  assert.equal(event.swapId, 'swap-1')
  assert.equal(event.name, 'QuotaExceededError')
  assert.equal(event.message, 'The quota has been exceeded.')
  assert.equal(event.cause, quota)
  assert.equal(event.occurrenceId, getErrorOccurrenceId(quota))
  assert.equal(Object.hasOwn(event, 'reasonCode'), false)
})

test('a throwing swap_created listener is a side-effect failure too: the swap is still returned and the host effects still run', async () => {
  const calls = []
  const reported = []
  setErrorLogger(event => reported.push(event))
  const lifecycle = []
  const result = await createSwapAttempt(
    async () => ({ request: async () => ({ data: swap }), useGasless: false, onCreated: [{ name: 'onSwapCreate', run: () => calls.push('onSwapCreate') }] }),
    {
      path: 'test.createSwap',
      lifecycleContext,
      onLifecycle: event => { lifecycle.push(event.step); if (event.step === 'swap_created') throw new Error('listener broke') },
      onGaslessUnavailable: () => assert.fail('not a request failure'),
    },
  )
  assert.equal(result, swap)
  assert.deepEqual(lifecycle, ['swap_creation_started', 'swap_created'])
  assert.deepEqual(calls, ['onSwapCreate'])
  assert.equal(reported.length, 1)
  assert.equal(reported[0].operation, 'swap_created_lifecycle')
})

test('non-Error throws from effects are still reported with a message', () => {
  const reported = []
  setErrorLogger(event => reported.push(event))
  announceCreatedSwap(swap, [{ name: 'weird', run: () => { throw 'plain string' } }])
  assert.equal(reported.length, 1)
  assert.equal(reported[0].type, 'SideEffectError')
  assert.equal(reported[0].message, 'plain string')
  assert.equal(reported[0].cause, 'plain string')
})

test('requestSwap flips gasless only for a refused use_gasless request', async () => {
  let flips = 0
  const flip = () => { flips++ }
  assert.equal(await requestSwap({ request: async () => ({ data: swap }), useGasless: true }, flip), swap)
  await assert.rejects(requestSwap({ request: async () => ({ data: { swap: { id: undefined } } }), useGasless: true }, flip), /Could not create swap/)
  await assert.rejects(requestSwap({ request: async () => undefined, useGasless: true }, flip), /Could not create swap/)
  assert.equal(flips, 0)
  await assert.rejects(requestSwap({ request: async () => ({ error: { code: 'X' } }), useGasless: false }, flip))
  assert.equal(flips, 0)
  await assert.rejects(requestSwap({ request: async () => ({ error: { code: 'X' } }), useGasless: true }, flip))
  await assert.rejects(requestSwap({ request: async () => { throw new Error('boom') }, useGasless: true }, flip))
  assert.equal(flips, 2)
})

// Static guards: the attempt boundary lives in lib/swapCreation; SwapDataProvider must not
// re-widen a catch around post-creation effects, and the helper must stay importable in Node
// without the HTTP client graph.
const distDir = new URL('../dist/esm/', import.meta.url).pathname
const builtSwapProvider = readFileSync(`${distDir}context/swap.js`, 'utf8')
const builtSwapCreation = readFileSync(`${distDir}lib/swapCreation.js`, 'utf8')

test('SwapDataProvider delegates the attempt to createSwapAttempt and owns no try/catch of its own', () => {
  assert.match(builtSwapProvider, /createSwapAttempt\(/)
  assert.doesNotMatch(builtSwapProvider, /\btry\s*\{/, 'context/swap.tsx must not wrap swap creation in try/catch; the scopes live in lib/swapCreation.ts')
  assert.doesNotMatch(builtSwapProvider, /\bcatch\b/)
  for (const step of ['swap_creation_started', 'swap_created', 'swap_creation_failed']) {
    assert.doesNotMatch(builtSwapProvider, new RegExp(`['"]${step}['"]`), `${step} is emitted only by lib/swapCreation.ts`)
    assert.match(builtSwapCreation, new RegExp(`['"]${step}['"]`))
  }
  assert.doesNotMatch(builtSwapProvider, /reportGaslessUnavailable\('create'\)[\s\S]*reportGaslessUnavailable\('create'\)/, 'one gasless flip site, passed as onGaslessUnavailable')
})

test('lib/swapCreation has no runtime dependency on the API client', () => {
  const runtimeImports = [...builtSwapCreation.matchAll(/^import\s.*?from\s+['"]([^'"]+)['"]/gm)].map(m => m[1])
  assert.ok(runtimeImports.length > 0)
  assert.deepEqual(runtimeImports.filter(s => /apiClients|Models\//.test(s)), [])
})
