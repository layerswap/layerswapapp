import assert from 'node:assert/strict'
import test, { after, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, useEffect } from 'react'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.example' })
const previousGlobals = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}

// The built package keeps the bundler's extensionless relative imports.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
      try { return nextResolve(`${specifier}.js`, context) } catch { return nextResolve(`${specifier}/index.js`, context) }
    }
    return nextResolve(specifier, context)
  },
})
after(() => {
  hooks.deregister()
  for (const key of ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']) {
    if (key in previousGlobals) Object.defineProperty(globalThis, key, previousGlobals[key])
    else delete globalThis[key]
  }
})

const { resolverService } = await import('../dist/esm/lib/resolvers/resolverService.js')
const { useBalanceStore } = await import('../dist/esm/stores/balanceStore.js')
const { ResolverProviders } = await import('../dist/esm/context/resolverContext.js')
const { BalanceResolver } = await import('../dist/esm/lib/balances/balanceResolver.js')
const { default: KnownInternalNames } = await import('../dist/esm/lib/knownIds.js')
const { createRoot } = await import('react-dom/client')

const network = { name: 'TEST_MAINNET', tokens: [] }
const balanceProvider = {
  supportsNetwork: candidate => candidate.name === network.name,
  fetchBalance: async () => [{ network: network.name, token: 'TEST', amount: 1, decimals: 18, isNativeCurrency: true }],
}
const walletProvider = { id: 'test', name: 'Test', createConnection: () => ({}), balanceProvider }

beforeEach(() => {
  useBalanceStore.getState().cleanupSortingBalances()
  useBalanceStore.setState({
    balances: {}, lastFetchMap: {}, initiatedBalances: null,
    balanceKeysForSorting: {}, sortingDataIsLoading: false, partialPublished: false,
  })
})

// Runs first: the resolver service is still uninitialized in this module instance.
test('a balance fetch before initialization settles unavailable and resumes on registration', async () => {
  assert.equal(resolverService.isInitialized(), false)
  const fetchBalance = useBalanceStore.getState().fetchBalance
  assert.deepEqual(await fetchBalance('0xabc', network), { balances: [] })
  const entry = useBalanceStore.getState().balances['0xabc:TEST_MAINNET']
  assert.equal(entry.status, 'unavailable')
  assert.equal(entry.promise, undefined)

  resolverService.setProviders([balanceProvider], [], [], [], [], [], [])
  await settle()
  const retried = await fetchBalance('0xabc', network)
  assert.equal(retried.balances[0].amount, 1)
})

const settle = () => new Promise(resolve => setTimeout(resolve, 0))
const countingProvider = (target, amount, calls) => ({
  supportsNetwork: candidate => candidate.name === target.name,
  fetchBalance: async () => { calls[target.name] = (calls[target.name] ?? 0) + 1; return [{ network: target.name, token: 'T', amount, decimals: 18, isNativeCurrency: true }] },
})

test('loading a provider refetches only the networks it newly covers', async () => {
  const servedNetwork = { name: 'SERVED_MAINNET', tokens: [] }
  const lateNetwork = { name: 'LATE_MAINNET', tokens: [] }
  const calls = {}
  const servedProvider = countingProvider(servedNetwork, 1, calls)
  const fetchBalance = useBalanceStore.getState().fetchBalance
  const balanceOf = key => useBalanceStore.getState().balances[key]
  resolverService.setProviders([servedProvider], [], [], [], [], [], [])
  await settle()

  await fetchBalance('0xdef', servedNetwork)
  // Missing providers are a settled availability state, not an RPC failure.
  assert.deepEqual((await fetchBalance('0xdef', lateNetwork)).balances, [])
  assert.equal(balanceOf('0xdef:LATE_MAINNET').status, 'unavailable')

  // Equivalent but re-created providers, as from a host that rebuilds them every render.
  resolverService.setProviders([countingProvider(servedNetwork, 1, calls)], [], [], [], [], [], [])
  await settle()
  assert.deepEqual(calls, { SERVED_MAINNET: 1 })

  // The late provider covers only LATE_MAINNET, so only that entry refetches.
  resolverService.setProviders([servedProvider, countingProvider(lateNetwork, 2, calls)], [], [], [], [], [], [])
  await settle()
  assert.equal(balanceOf('0xdef:LATE_MAINNET').data.balances[0].amount, 2)
  assert.equal(balanceOf('0xdef:LATE_MAINNET').status, 'success')
  assert.deepEqual(calls, { SERVED_MAINNET: 1, LATE_MAINNET: 1 })
})

test('a provider that loads while an unsupported fetch is in flight still gets used', async () => {
  const inFlightNetwork = { name: 'IN_FLIGHT_MAINNET', tokens: [] }
  const calls = {}
  resolverService.setProviders([balanceProvider], [], [], [], [], [], [])
  await settle()

  const pending = useBalanceStore.getState().fetchBalance('0xfed', inFlightNetwork)
  // Let the job check coverage against the old list, then load the provider before it settles.
  await Promise.resolve()
  resolverService.setProviders([balanceProvider, countingProvider(inFlightNetwork, 3, calls)], [], [], [], [], [], [])
  assert.deepEqual((await pending).balances, [])
  await settle()
  assert.equal(useBalanceStore.getState().balances['0xfed:IN_FLIGHT_MAINNET'].data.balances[0].amount, 3)
  assert.deepEqual(calls, { IN_FLIGHT_MAINNET: 1 })
})

test('registration before an unavailable attempt settles is not lost', async () => {
  const target = { name: 'DELAYED_UNAVAILABLE', tokens: [] }
  resolverService.setProviders([], [], [], [], [])
  await settle()
  const { resolver } = resolverService.getBalanceSnapshot()
  const resolveBalance = resolver.resolveBalance.bind(resolver)
  let release
  const completion = new Promise(resolve => { release = resolve })
  // Hold completion after provider selection, so the notification definitely
  // runs while the request is still in flight and absent from the waiting set.
  resolver.resolveBalance = async (...args) => {
    const result = await resolveBalance(...args)
    await completion
    return result
  }
  const pending = useBalanceStore.getState().fetchBalance('0xdelayed', target)
  await settle()
  const calls = {}
  resolverService.setProviders([countingProvider(target, 5, calls)], [], [], [], [])
  await settle()
  assert.deepEqual(calls, {})
  assert.equal(useBalanceStore.getState().balances['0xdelayed:DELAYED_UNAVAILABLE'].status, 'loading')
  release()
  await pending
  await settle()
  assert.deepEqual(calls, { DELAYED_UNAVAILABLE: 1 })
  assert.equal(useBalanceStore.getState().balances['0xdelayed:DELAYED_UNAVAILABLE'].data.balances[0].amount, 5)
})

test('children can use the resolvers in their first render and mount effects', async () => {
  // Reset the singleton to its initial state, as on a fresh page load.
  for (const key of ['balanceResolver', 'gasResolver', 'nftResolver', 'transferResolver', 'contractAddressResolver', 'rpcHealthCheckResolver', 'gaslessResolver']) resolverService[key] = null
  const seen = []
  const Child = () => {
    seen.push(['render', resolverService.isInitialized()])
    useEffect(() => { seen.push(['effect', !!resolverService.getBalanceResolver()]) }, [])
    return null
  }
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () => { root.render(createElement(ResolverProviders, { walletProviders: [walletProvider] }, createElement(Child))) })
  await act(async () => { root.unmount() })
  assert.deepEqual(seen, [['render', true], ['effect', true]])
})


test('unsupported batches check coverage once per request and once per coalesced registration', async () => {
  let checks = 0
  const provider = {
    supportsNetwork: () => { checks++; return false },
    fetchBalance: async () => { assert.fail('unavailable networks must not fetch') },
  }
  resolverService.setProviders([provider], [], [], [], [])
  await settle()
  await Promise.all(Array.from({ length: 100 }, (_, i) =>
    useBalanceStore.getState().fetchBalance('0xbatch', { name: `BATCH_${i}`, tokens: [] })))
  await settle()
  assert.equal(checks, 100, 'completion must not re-scan waiting requests')

  for (let i = 0; i < 3; i++) resolverService.setProviders([provider], [], [], [], [])
  await settle()
  assert.equal(checks, 200, 'same-turn registrations should cause one pass')
})

test('automatic retries preserve policy despite cache hits and callers joining the promise', async () => {
  resolverService.setProviders([], [], [], [], [])
  await settle()
  const fetchBalance = useBalanceStore.getState().fetchBalance
  const target = { name: 'POLICY_MAINNET', tokens: [] }
  const policy = { retryCount: 0, timeoutMs: 250 }
  const pending = fetchBalance('0xpolicy', target, policy)
  assert.equal(fetchBalance('0xpolicy', target), pending)
  await pending
  await fetchBalance('0xpolicy', target)
  const received = []
  let complete
  const response = new Promise(resolve => { complete = resolve })
  resolverService.setProviders([{
    supportsNetwork: () => true,
    fetchBalance: async (_address, _network, options) => { received.push(options); return response },
  }], [], [], [], [])
  await settle()
  const retry = fetchBalance('0xpolicy', target, { retryCount: 9 })
  assert.deepEqual(received, [policy])
  complete([])
  await retry
  assert.deepEqual(useBalanceStore.getState().balances['0xpolicy:POLICY_MAINNET'].request.policy, policy)
})

test('a throwing predicate becomes a cached failure and does not escape its request', async () => {
  let checks = 0
  const failure = new Error('predicate failed')
  resolverService.setProviders([{
    supportsNetwork: () => { checks++; throw failure },
    fetchBalance: async () => { assert.fail('predicate failed before fetch') },
  }], [], [], [], [])
  await settle()
  const fetchBalance = useBalanceStore.getState().fetchBalance
  await assert.rejects(fetchBalance('0xbroken', network), /predicate failed/)
  await settle() // Node's test runner also detects unhandled background errors.
  const entry = useBalanceStore.getState().balances['0xbroken:TEST_MAINNET']
  assert.equal(entry.status, 'error')
  assert.equal(entry.error.cause, failure)
  assert.equal(entry.promise, undefined)
  await assert.rejects(fetchBalance('0xbroken', network), /predicate failed/)
  assert.equal(checks, 1)
})

test('a predicate failure during registration does not stop later waiting requests', async () => {
  const broken = { name: 'BROKEN_MAINNET', tokens: [] }
  const good = { name: 'GOOD_MAINNET', tokens: [] }
  resolverService.setProviders([], [], [], [], [])
  await settle()
  const fetchBalance = useBalanceStore.getState().fetchBalance
  await fetchBalance('0xregistration', broken)
  await fetchBalance('0xregistration', good)
  let checks = 0
  let fetches = 0
  const provider = {
    supportsNetwork: target => {
      checks++
      if (target.name === broken.name) throw new Error('bad coverage')
      return true
    },
    fetchBalance: async () => { fetches++; return [] },
  }
  resolverService.setProviders([provider], [], [], [], [])
  await settle()
  assert.equal(useBalanceStore.getState().balances['0xregistration:BROKEN_MAINNET'].status, 'error')
  assert.equal(useBalanceStore.getState().balances['0xregistration:GOOD_MAINNET'].status, 'success')
  assert.equal(fetches, 1)
  resolverService.setProviders([provider], [], [], [], [])
  await settle()
  assert.equal(checks, 2, 'failed and successful entries both leave the waiting set')
})

test('resolver results distinguish missing providers, failed fetches and empty wallets', async () => {
  assert.deepEqual(await new BalanceResolver([]).resolveBalance(network, '0xresult'), { kind: 'unavailable' })
  const empty = new BalanceResolver([{ supportsNetwork: () => true, fetchBalance: async () => [] }])
  assert.deepEqual(await empty.resolveBalance(network, '0xresult'), { kind: 'resolved', data: { balances: [] } })
  const failed = new BalanceResolver([{
    supportsNetwork: () => true,
    fetchBalance: async () => { throw new Error('RPC failed') },
  }])
  const result = await failed.resolveBalance(network, '0xresult')
  assert.equal(result.kind, 'failed')
  assert.match(result.error.message, /RPC failed/)
  assert.deepEqual(await failed.getBalance(network, '0xresult'), { balances: [] }, 'legacy data-only API remains compatible')
})

test('sorting settles unavailable networks and publishes their balances when providers arrive', async () => {
  const target = { name: 'SORTING_MAINNET', tokens: [], source_rank: 1 }
  resolverService.setProviders([], [], [], [], [])
  await settle()
  useBalanceStore.getState().initSortingBalances([{ address: '0xsort', network: target }])
  await settle()
  assert.equal(useBalanceStore.getState().sortingDataIsLoading, false)
  assert.equal(useBalanceStore.getState().balances['0xsort:SORTING_MAINNET'].status, 'unavailable')
  assert.deepEqual(useBalanceStore.getState().balanceKeysForSorting, { SORTING_MAINNET: '0xsort:SORTING_MAINNET' })
  let received
  resolverService.setProviders([{
    supportsNetwork: () => true,
    fetchBalance: async (_address, _network, policy) => {
      received = policy
      return [{ network: target.name, token: 'T', amount: 4, decimals: 18, isNativeCurrency: true }]
    },
  }], [], [], [], [])
  await settle()
  assert.equal(received.retryCount, 0)
  assert.equal(useBalanceStore.getState().balances['0xsort:SORTING_MAINNET'].data.balances[0].amount, 4)
  assert.equal(useBalanceStore.getState().sortingDataIsLoading, false)
})


test('queued requests capture the latest resolver when a queue slot opens', async () => {
  let release
  const pendingResponse = new Promise(resolve => { release = resolve })
  let oldFetches = 0
  resolverService.setProviders([{
    supportsNetwork: () => true,
    fetchBalance: async () => { oldFetches++; return pendingResponse },
  }], [], [], [], [])
  await settle()
  // Occupy all 500 queue slots and leave one request waiting for execution.
  const pending = Array.from({ length: 501 }, (_, i) =>
    useBalanceStore.getState().fetchBalance('0xqueue', { name: `QUEUE_${i}`, tokens: [] }))
  await settle()
  assert.equal(oldFetches, 500)
  const newFetches = []
  resolverService.setProviders([{
    supportsNetwork: () => true,
    fetchBalance: async (_address, target) => { newFetches.push(target.name); return [] },
  }], [], [], [], [])
  release([])
  await Promise.all(pending)
  await settle()
  assert.deepEqual(newFetches, ['QUEUE_500'])
  assert.equal(oldFetches, 500, 'supported in-flight requests do not restart on registration')
})

test('intentionally skipped networks resolve without invoking provider predicates', async () => {
  const resolver = new BalanceResolver([{
    supportsNetwork: () => { assert.fail('skipped networks must not check providers') },
    fetchBalance: async () => { assert.fail('skipped networks must not fetch') },
  }])
  assert.deepEqual(await resolver.resolveBalance({ name: KnownInternalNames.Networks.ParadexMainnet, tokens: [] }, '0xskip'), {
    kind: 'resolved', data: { balances: [] },
  })
})

test('sorting settles failed requests even when they have no cached data', async () => {
  resolverService.setProviders([{
    supportsNetwork: () => true,
    fetchBalance: async () => { throw new Error('sorting RPC failed') },
  }], [], [], [], [])
  await settle()
  useBalanceStore.getState().initSortingBalances([{ address: '0xfailedsort', network }])
  await settle()
  assert.equal(useBalanceStore.getState().balances['0xfailedsort:TEST_MAINNET'].status, 'error')
  assert.equal(useBalanceStore.getState().sortingDataIsLoading, false)
})
