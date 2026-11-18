import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    // swapLifecycle pulls in the API client types only; keep the HTTP client out of the test.
    if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) {
      return { url: 'data:text/javascript,export const BackendTransactionStatus = { Pending: "pending" }', shortCircuit: true }
    }
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
      return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
  },
})
after(() => hooks.deregister())

const { ensureSourceChain, needsChainSwitch, NetworkSwitchError, networkSwitchFailureReason } =
  await import('../dist/esm/components/Pages/Swap/Withdraw/Wallet/Common/ensureSourceChain.js')

const network = { name: 'OPTIMISM_MAINNET', display_name: 'Optimism', chain_id: '10' }
const context = { swapId: 'swap-a', sourceNetwork: network.name }

test('adapter readiness is consulted even when the React chain snapshot matches', async () => {
  const events = []
  const controller = new AbortController()
  let checks = 0
  await ensureSourceChain({
    wallet: { chainId: 10, providerName: 'EVM' }, network, context, path: 'SendTransactionButton', signal: controller.signal,
    switchChain: () => assert.fail('legacy switch must not run'),
    ensureChain: async (_wallet, chainId, options) => {
      checks++
      assert.equal(chainId, '10')
      assert.equal(options.signal, controller.signal)
      options.onSwitchStart()
    },
    onLifecycle: e => events.push(e.step),
  })
  assert.equal(checks, 1)
  assert.deepEqual(events, ['network_switch_started', 'network_switched'])
})

test('live readiness avoids a redundant switch when the React snapshot is stale', async () => {
  const events = []
  await ensureSourceChain({
    wallet: { chainId: 1, providerName: 'EVM' }, network, context, path: 'SendTransactionButton',
    ensureChain: async () => {}, switchChain: () => assert.fail('legacy switch must not run'),
    onSwitchStart: () => assert.fail('no switch needed'), onLifecycle: e => events.push(e),
  })
  assert.deepEqual(events, [])
})

test('the adapter owns its deadline and cancellation does not report a wallet failure', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const controller = new AbortController()
  const pending = Promise.withResolvers()
  const events = []
  const result = ensureSourceChain({
    wallet: { chainId: 1, providerName: 'EVM' }, network, context, path: 'SendTransactionButton',
    signal: controller.signal, timeoutMs: 1, switchChain: undefined,
    ensureChain: (_wallet, _chainId, options) => { options.onSwitchStart(); return pending.promise },
    onLifecycle: e => events.push(e.step),
  })
  t.mock.timers.tick(60_000)
  await Promise.resolve()
  assert.deepEqual(events, ['network_switch_started'])
  controller.abort()
  pending.resolve()
  await assert.rejects(result, { name: 'AbortError' })
  assert.deepEqual(events, ['network_switch_started'])
})

for (const [kind, walletError] of [
  ['disconnected', Object.assign(new Error('Selected wallet account is no longer connected. Reconnect your wallet.'), { reasonCode: 'wallet_disconnected' })],
  ['pending', Object.assign(new Error('A network request is already pending for this wallet'), { code: -32002 })],
  ['timeout', Object.assign(new Error('Timed out waiting for wallet network 1; phase=eth_chainId'), { reasonCode: 'timeout' })],
]) {
  test(`a ${kind} readiness failure before any switch is reported and keeps its recovery`, async () => {
    const events = []
    await assert.rejects(ensureSourceChain({
      wallet: { chainId: 10, providerName: 'EVM' }, network, context, path: 'SendTransactionButton', switchChain: undefined,
      ensureChain: async () => { throw walletError },
      onLifecycle: e => events.push(e.step),
    }), error => error instanceof NetworkSwitchError && error.kind === kind && error.cause === walletError)
    assert.deepEqual(events, ['network_switch_failed'])
  })
}

test('a disconnect during a switch is reported, then surfaced as a disconnect', async () => {
  const events = []
  const walletError = Object.assign(new Error('Selected wallet disconnected. Reconnect your wallet.'), { reasonCode: 'wallet_disconnected' })
  await assert.rejects(ensureSourceChain({
    wallet: { chainId: 1, providerName: 'EVM' }, network, context, path: 'SendTransactionButton', switchChain: undefined,
    ensureChain: async (_wallet, _chainId, options) => { options.onSwitchStart(); throw walletError },
    onLifecycle: e => events.push(e),
  }), error => error instanceof NetworkSwitchError && error.kind === 'disconnected' && error.cause === walletError)
  assert.deepEqual(events.map(e => e.step), ['network_switch_started', 'network_switch_failed'])
  assert.equal(events[1].reasonCode, 'wallet_disconnected')
})

test('only wallets reporting a different chain need a switch', () => {
  // wagmi reports numbers, the API serves strings; non-EVM wallets report no chain at all.
  assert.equal(needsChainSwitch({ chainId: 10 }, network), false)
  assert.equal(needsChainSwitch({ chainId: '10' }, network), false)
  assert.equal(needsChainSwitch({ chainId: 1 }, network), true)
  assert.equal(needsChainSwitch({ chainId: undefined }, network), false)
  assert.equal(needsChainSwitch({ chainId: '' }, network), false)
  assert.equal(needsChainSwitch({ chainId: 1 }, { chain_id: null }), false)
})

test('a wallet already on the source chain is left alone and reports nothing', async () => {
  const lifecycle = []
  let switches = 0
  let starts = 0
  await ensureSourceChain({
    wallet: { chainId: 10, providerName: 'EVM' }, network, context, path: 'SendTransactionButton',
    switchChain: async () => { switches++ }, onSwitchStart: () => { starts++ },
    onLifecycle: event => lifecycle.push(event),
  })
  assert.equal(switches, 0)
  assert.equal(starts, 0)
  assert.deepEqual(lifecycle, [])
})

test('Fuel testnet chain 0 is a reported network, for both numeric and string IDs', () => {
  const mainnet = { chain_id: '9889' }
  const testnet = { chain_id: '0' }
  assert.equal(needsChainSwitch({ chainId: 0 }, mainnet), true)
  assert.equal(needsChainSwitch({ chainId: '0' }, mainnet), true)
  assert.equal(needsChainSwitch({ chainId: 9889 }, testnet), true)
  assert.equal(needsChainSwitch({ chainId: 0 }, testnet), false)
  assert.equal(needsChainSwitch({ chainId: '0' }, testnet), false)
})

for (const [from, to] of [[0, '9889'], [9889, '0']]) {
  test(`Fuel switches from ${from} to ${to} before allowing the transfer`, async () => {
    const events = []
    const switches = []
    const wallet = { chainId: from, providerName: 'Fuel' }
    await ensureSourceChain({
      wallet,
      network: { name: 'FUEL', display_name: 'Fuel', chain_id: to },
      context, path: 'SendTransactionButton',
      switchChain: async (...args) => { switches.push(args) },
      onLifecycle: event => events.push(event),
    })
    assert.deepEqual(switches, [[wallet, to]])
    assert.deepEqual(events.map(event => event.step), ['network_switch_started', 'network_switched'])
    assert.equal(events.at(-1).action, `switch_to_${to}`)
  })
}

const PENDING_MESSAGE = "Request of type 'wallet_switchEthereumChain' already pending for origin https://layerswap.io. Please wait."

for (const result of ['switched', 'rejected', 'pending', 'timeout', 'failed', 'unsupported']) {
  test(`a wallet on another chain is switched before the transfer: ${result}`, async () => {
    const lifecycle = []
    const switches = []
    let starts = 0
    const walletError = result === 'rejected'
      ? Object.assign(new Error('User declined'), { code: 4001 })
      : result === 'pending'
        ? Object.assign(new Error(PENDING_MESSAGE), { code: -32002 })
        : Object.assign(new Error('Switch failed'), { shortMessage: 'Chain not configured' })
    const wallet = { chainId: 1, providerName: 'EVM' }
    const run = ensureSourceChain({
      wallet, network, context, path: 'SendTransactionButton', timeoutMs: 20,
      switchChain: result === 'unsupported' ? undefined : async (...args) => {
        switches.push(args)
        assert.equal(starts, 1, 'the pending UI is shown before the wallet prompt')
        // Some in-app browsers never answer a prompt the user dismissed natively.
        if (result === 'timeout') return new Promise(() => {})
        if (result !== 'switched') throw walletError
      },
      onSwitchStart: () => { starts++ },
      onLifecycle: event => lifecycle.push(event),
    })

    const expectedKind = { rejected: 'rejected', pending: 'pending', timeout: 'timeout', failed: 'failed', unsupported: 'failed' }[result]
    if (result === 'switched') await run
    else await assert.rejects(run, error => {
      assert.ok(error instanceof NetworkSwitchError)
      assert.equal(error.kind, expectedKind)
      if (result === 'unsupported') assert.match(error.cause.message, /cannot switch networks/)
      else if (result === 'timeout') assert.match(error.cause.message, /Timed out switching to Optimism/)
      else assert.equal(error.cause, walletError)
      return true
    })

    assert.deepEqual(switches, result === 'unsupported' ? [] : [[wallet, '10']])
    assert.equal(starts, result === 'unsupported' ? 0 : 1)
    assert.deepEqual(lifecycle.map(event => event.step), [
      'network_switch_started',
      result === 'switched' ? 'network_switched' : result === 'rejected' ? 'network_switch_rejected' : 'network_switch_failed',
    ])
    for (const event of lifecycle) {
      assert.equal(event.stage, 'network_switch')
      assert.equal(event.path, 'SendTransactionButton')
      assert.equal(event.action, 'switch_to_10')
      assert.equal(event.provider, 'EVM')
      assert.equal(event.swapId, 'swap-a')
    }
    const outcome = lifecycle.at(-1)
    assert.equal(outcome.outcome, result === 'switched' ? 'succeeded' : result === 'rejected' ? 'rejected' : 'failed')
    const expectedReason = { rejected: 'user_rejected', pending: 'request_pending', timeout: 'timeout' }[result]
    if (expectedReason) assert.equal(outcome.reasonCode, expectedReason)
    if (result === 'failed') assert.equal(networkSwitchFailureReason(await run.catch(error => error)), 'Chain not configured')
  })
}
