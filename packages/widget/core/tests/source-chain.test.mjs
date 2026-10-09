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
