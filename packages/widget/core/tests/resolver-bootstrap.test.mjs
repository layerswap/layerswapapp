import assert from 'node:assert/strict'
import test, { after } from 'node:test'
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
const { createRoot } = await import('react-dom/client')

const network = { name: 'TEST_MAINNET', tokens: [] }
const balanceProvider = {
  supportsNetwork: candidate => candidate.name === network.name,
  fetchBalance: async () => [{ network: network.name, token: 'TEST', amount: 1, decimals: 18, isNativeCurrency: true }],
}
const walletProvider = { id: 'test', name: 'Test', createConnection: () => ({}), balanceProvider }

// Runs first: the resolver service is still uninitialized in this module instance.
test('a balance fetch before resolver initialization fails once instead of wedging the entry', async () => {
  assert.equal(resolverService.isInitialized(), false)
  const fetchBalance = useBalanceStore.getState().fetchBalance
  await assert.rejects(fetchBalance('0xabc', network), /ResolverService not initialized/)
  const entry = useBalanceStore.getState().balances['0xabc:TEST_MAINNET']
  assert.equal(entry.status, 'error')
  assert.equal(entry.promise, undefined, 'a settled failure must not be returned to later fetches')

  resolverService.setProviders([balanceProvider], [], [], [], [], [], [])
  // Within the dedupe window a plain fetch reports the cached failure, not a false success.
  await assert.rejects(fetchBalance('0xabc', network), /ResolverService not initialized/)

  const retried = await fetchBalance('0xabc', network, { ignoreCache: true })
  assert.equal(retried.balances[0].amount, 1)
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
