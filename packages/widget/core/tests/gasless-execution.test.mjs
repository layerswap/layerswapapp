import assert from 'node:assert/strict'
import test, { after, afterEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    // This path only needs the API status enum; keep the HTTP/browser client
    // out of the test while exercising real execution, classification and stores.
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

const { executeGaslessAuthorization } = await import('../dist/esm/components/Pages/Swap/Withdraw/Wallet/Common/depositExecution.js')
const { useGaslessPreferenceStore } = await import('../dist/esm/stores/gaslessPreferenceStore.js')
const { widgetTelemetry } = await import('../dist/esm/lib/widgetTelemetry.js')
afterEach(() => useGaslessPreferenceStore.getState().resetGaslessPreference())

for (const [code, rejected] of [[4001, true], ['4001', true], ['ACTION_REJECTED', true], [-32603, false]]) {
  test(`gasless signing with code ${JSON.stringify(code)} and a nested RPC error records ${rejected ? 'cancellation' : 'failure'}`, async t => {
    const lifecycle = []
    const telemetry = []
    t.after(widgetTelemetry.register(event => telemetry.push(event)))
    const error = Object.assign(new Error('Wallet request failed'), { code, cause: { code: -32603 } })
    const unexpected = () => assert.fail('a failed signature must not authorize or submit a transfer')
    const signAction = { type: 'sign', typed_data: { message: { validBefore: '123' } } }
    const ctx = {
      swapData: { id: 'swap-gasless', source_address: 'source' },
      depositActions: [signAction],
      swapBasicData: { requested_amount: '1', use_deposit_address: false },
      selectedWallet: { providerName: 'test-wallet' },
      sourceAddress: 'source',
      layerswapApiClient: { AuthorizeSwapAsync: unexpected, GetDepositActionsAsync: unexpected },
      setActionStateText() {},
      setSwapTransaction: unexpected,
      onSuccess: unexpected,
      onLifecycle: event => lifecycle.push(event),
    }
    let signed = false
    await assert.rejects(executeGaslessAuthorization(ctx, async action => {
      signed = true
      assert.equal(action, signAction)
      throw error
    }), caught => caught === error)
    assert.equal(signed, true)
    assert.deepEqual(lifecycle.map(event => event.step), ['wallet_prompt_opened', rejected ? 'wallet_action_rejected' : 'wallet_action_failed'])
    assert.equal(lifecycle.at(-1).reasonCode, rejected ? 'user_rejected' : 'internal_rpc_error')
    assert.equal(lifecycle.at(-1).errorCode, String(code))
    assert.equal(useGaslessPreferenceStore.getState().gaslessUnavailable, !rejected)
    assert.equal(useGaslessPreferenceStore.getState().gaslessFailureStage, rejected ? null : 'deposit')
    assert.equal(telemetry.length, 1)
    assert.equal(telemetry[0].attributes.outcome, rejected ? 'rejected' : 'failed')
  })
}
