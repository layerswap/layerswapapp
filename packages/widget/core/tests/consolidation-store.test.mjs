import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test, { after, beforeEach } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)

const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const storage = new Map()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
} })

function loadSource(path, imports = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)(name => {
    if (['zustand', 'zustand/middleware'].includes(name)) return require(name)
    if (name in imports) return imports[name]
    throw new Error(`Unexpected ${path} dependency: ${name}`)
  }, module, module.exports)
  return module.exports
}

const helpers = loadSource('helpers/consolidation.ts', {
  '@layerswap/widget-types': { NetworkType: { EVM: 'evm' } },
  '@/lib/extendedRoutes/amounts': loadSource('lib/extendedRoutes/amounts.ts'),
  '@/lib/gases/resolveGasBalanceBudget': loadSource('lib/gases/resolveGasBalanceBudget.ts'),
  '@/components/utils/swapPhase': loadSource('components/utils/swapPhase.ts'),
})
const { useConsolidationStore: store, sanitizeConsolidations, findResumable } = loadSource('stores/consolidationStore.ts', {
  '../helpers/consolidation': helpers,
})

const HOUR = 60 * 60 * 1000
const leg = (id, extra = {}) => ({ id, network: `${id}_NETWORK`, token: 'USDC', amount: '1', state: 'pending', ...extra })
const record = (id, extra = {}) => ({
  id, createdAt: 1_000, status: 'executing', activeLegId: 'a', sourceAddress: '0xsource', stopped: false,
  destination: { network: 'ARBITRUM_MAINNET', token: 'USDC', address: '0xdest' },
  legs: [leg('a'), leg('b'), leg('c')],
  ...extra,
})

beforeEach(() => {
  storage.clear()
  store.setState(store.getInitialState(), true)
})
after(() => {
  if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
  else delete globalThis.localStorage
})

test('saved records are sanitized: invalid records and legs are dropped, unknown states fall back safely', () => {
  const saved = {
    records: {
      ok: { ...record('ignored-id'), status: 'executing', activeLegId: 'b', legs: [leg('a', { state: 'submitted', swapId: 'swap-a' }), leg('b'), { id: 'bad' }, leg('c', { state: 'weird' })] },
      noAddress: { ...record('noAddress'), sourceAddress: '' },
      legacyReview: { ...record('legacyReview'), status: 'review', activeLegId: undefined },
      noLegs: { ...record('noLegs'), legs: [] },
      duplicateLegs: { ...record('duplicateLegs'), legs: [leg('a'), leg('a')] },
      junk: 'nope',
    },
  }
  const { records } = sanitizeConsolidations(saved)
  assert.deepEqual(Object.keys(records), ['ok'])
  assert.equal(records.ok.id, 'ok')
  assert.equal(records.ok.status, 'executing')
  assert.equal(records.ok.activeLegId, 'b')
  assert.deepEqual(records.ok.legs.map(l => [l.id, l.state, l.swapId]), [['a', 'submitted', 'swap-a'], ['b', 'pending', undefined], ['c', 'pending', undefined]])
  assert.equal(sanitizeConsolidations({ records: { x: { ...record('x'), activeLegId: 'missing' } } }).records.x.activeLegId, undefined)
  assert.deepEqual(sanitizeConsolidations(undefined), { records: {} })
})

test('legacy persisted state rehydrates through the same sanitizer', async () => {
  storage.set('consolidations', JSON.stringify({ state: { records: { r: record('r'), broken: { legs: 'x' } } }, version: 0 }))
  await store.persist.rehydrate()
  assert.deepEqual(Object.keys(store.getState().records), ['r'])
})

test('submissions and skips advance the queue to the next pending leg', () => {
  const s = store.getState()
  s.createRecord(record('r'))
  assert.equal(store.getState().records.r.activeLegId, 'a')

  s.setLegSwapId('r', 'a', 'swap-a')
  s.markLegSubmitted('r', 'a')
  assert.equal(store.getState().records.r.legs[0].swapId, 'swap-a')
  assert.equal(store.getState().records.r.activeLegId, 'b')

  s.setLegAmount('r', 'b', '2')
  s.setLegAmount('r', 'a', '9')
  assert.deepEqual(store.getState().records.r.legs.map(l => l.amount), ['1', '2', '1'])

  s.cancelLeg('r', 'b')
  assert.equal(store.getState().records.r.activeLegId, 'c')
  s.markLegSubmitted('r', 'c')
  assert.equal(store.getState().records.r.activeLegId, undefined)
  assert.equal(helpers.isRecordFinished(store.getState().records.r), true)
})

test('stopping keeps the active leg for its in-flight wallet action and cancels the rest', () => {
  const s = store.getState()
  s.createRecord(record('r'))
  s.stopRemaining('r')
  const stopped = store.getState().records.r
  assert.equal(stopped.stopped, true)
  assert.deepEqual(stopped.legs.map(l => l.state), ['pending', 'cancelled', 'cancelled'])
  s.markLegSubmitted('r', 'a')
  assert.equal(store.getState().records.r.activeLegId, undefined)
  assert.equal(helpers.isRecordFinished(store.getState().records.r), true)
})

test('only started records with unsent legs for the same address are resumable, newest first', () => {
  const equals = (a, b) => a.toLowerCase() === b.toLowerCase()
  const started = [leg('a', { state: 'submitted' }), leg('b')]
  const records = {
    done: record('done', { status: 'done', legs: started }),
    older: record('older', { createdAt: 1, legs: started }),
    newer: record('newer', { createdAt: 2, legs: started }),
    notStarted: record('notStarted', { createdAt: 5 }),
    allSent: record('allSent', { createdAt: 3, legs: [leg('a', { state: 'submitted' })] }),
    other: record('other', { createdAt: 4, sourceAddress: '0xother', legs: started }),
  }
  assert.equal(findResumable(records, '0xSOURCE', equals)?.id, 'newer')
  assert.equal(findResumable(records, undefined, equals), undefined)
})

test('garbage collection drops finished records and anything older than a week', () => {
  const now = 10 * 24 * HOUR
  const s = store.getState()
  s.createRecord(record('recent', { createdAt: now - 2 * HOUR }))
  s.createRecord(record('executing', { createdAt: now - 3 * 24 * HOUR }))
  s.createRecord(record('ancient', { createdAt: now - 8 * 24 * HOUR }))
  s.createRecord(record('done', { status: 'done', createdAt: now }))
  s.gc(now)
  assert.deepEqual(Object.keys(store.getState().records).sort(), ['executing', 'recent'])
  assert.deepEqual(Object.keys(JSON.parse(storage.get('consolidations')).state.records).sort(), ['executing', 'recent'])
})

test('outcomes persist and a refunded leg can be sent again as a fresh attempt', () => {
  const s = store.getState()
  s.createRecord(record('r'))
  s.markLegSubmitted('r', 'a')
  s.setLegSwapId('r', 'a', 'swap-a')
  s.setLegOutcome('r', 'a', 'refunded')
  assert.equal(store.getState().records.r.legs[0].outcome, 'refunded')
  s.retryLeg('r', 'a')
  const retried = store.getState().records.r.legs[0]
  assert.deepEqual([retried.state, retried.swapId, retried.outcome, retried.attempt], ['pending', undefined, undefined, 1])
  assert.equal(store.getState().records.r.activeLegId, 'a')
  assert.equal(sanitizeConsolidations({ records: { x: { ...record('x'), legs: [leg('a', { outcome: 'delivered', received: 5, attempt: 2 })] } } }).records.x.legs[0].received, 5)
})
