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

for (const [code, rejected, message = 'Wallet request failed'] of [[4001, true], ['4001', true], ['ACTION_REJECTED', true], [-32603, false], [undefined, true, 'User has rejected the request.']]) {
  test(`gasless signing with code ${JSON.stringify(code)} and a nested RPC error records ${rejected ? 'cancellation' : 'failure'}`, async t => {
    const lifecycle = []
    const telemetry = []
    t.after(widgetTelemetry.register(event => telemetry.push(event)))
    const error = Object.assign(new Error(message), { code, cause: { code: -32603 } })
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
    assert.equal(lifecycle.at(-1).errorCode, code === undefined ? undefined : String(code))
    assert.equal(useGaslessPreferenceStore.getState().gaslessUnavailable, !rejected)
    assert.equal(useGaslessPreferenceStore.getState().gaslessFailureStage, rejected ? null : 'deposit')
    assert.equal(telemetry.length, 1)
    assert.equal(telemetry[0].attributes.outcome, rejected ? 'rejected' : 'failed')
  })
}

function gaslessContext({ authorize, refresh, lifecycle, submitted = [] }) {
  const signAction = { type: 'sign', typed_data: { message: { validBefore: '123' } } }
  return {
    signAction,
    ctx: {
      swapData: { id: 'swap-gasless-api', source_address: 'source' },
      depositActions: [signAction],
      swapBasicData: { requested_amount: '1', use_deposit_address: false },
      selectedWallet: { providerName: 'test-wallet' },
      sourceAddress: 'source',
      layerswapApiClient: { AuthorizeSwapAsync: authorize, GetDepositActionsAsync: refresh },
      setActionStateText() {},
      setSwapTransaction: (...args) => submitted.push(args),
      onSuccess() {},
      onLifecycle: event => lifecycle.push(event),
    },
  }
}

test('an API refusal of the signed authorization is a gasless authorization failure, not a wallet failure', async () => {
  const lifecycle = []
  const refusal = Object.assign(new Error('Request failed'), { response: { data: { error: { code: 'GASLESS_NOT_SUPPORTED', message: 'Gasless is not supported' } } } })
  const { ctx } = gaslessContext({
    authorize: async () => { throw refusal },
    refresh: () => assert.fail('a refusal is not an expiry'),
    lifecycle,
  })
  await assert.rejects(executeGaslessAuthorization(ctx, async () => '0xsig'), caught => caught === refusal)
  assert.deepEqual(lifecycle.map(event => event.step), ['wallet_prompt_opened', 'gasless_authorization_failed'])
  assert.equal(lifecycle.at(-1).stage, 'input_transfer')
  assert.equal(lifecycle.at(-1).action, 'authorize_deposit')
  assert.equal(useGaslessPreferenceStore.getState().gaslessUnavailable, true, 'the fallback behaviour is unchanged')
})

test('a failed refresh of an expired authorization is a gasless authorization failure with its own reason', async () => {
  const lifecycle = []
  const expired = Object.assign(new Error('Authorization expired'), {})
  const { ctx } = gaslessContext({
    authorize: async () => { throw expired },
    refresh: async () => ({ data: [] }),
    lifecycle,
  })
  await assert.rejects(executeGaslessAuthorization(ctx, async () => '0xsig'), /Could not refresh the gasless deposit authorization/)
  assert.deepEqual(lifecycle.map(event => event.step), ['wallet_prompt_opened', 'gasless_authorization_failed'])
  assert.equal(lifecycle.at(-1).reasonCode, 'deposit_action_refresh_failed')
})

test('the re-sign after an expired authorization opens a second wallet prompt', async () => {
  const lifecycle = []
  const submitted = []
  let authorizations = 0
  const freshSignAction = { type: 'sign', typed_data: { message: { validBefore: '456' } } }
  const { ctx } = gaslessContext({
    authorize: async () => { if (authorizations++ === 0) throw new Error('Authorization expired') },
    refresh: async () => ({ data: [freshSignAction] }),
    lifecycle,
    submitted,
  })
  const signed = []
  await executeGaslessAuthorization(ctx, async action => { signed.push(action); return '0xsig' })
  assert.equal(signed.length, 2)
  assert.equal(signed[1], freshSignAction)
  assert.deepEqual(lifecycle.map(event => event.step), ['wallet_prompt_opened', 'wallet_prompt_opened', 'gasless_authorization_submitted'])
  assert.equal(submitted.length, 1)
})

for (const fails of [false, true]) {
  test(`self-paid authorization ${fails ? 'failure' : 'success'} never submits a gasless deposit`, async () => {
    const lifecycle = []
    const submitted = []
    const refusal = new Error('Authorization unavailable')
    const { ctx } = gaslessContext({
      authorize: async () => { if (fails) throw refusal },
      refresh: () => assert.fail('no refresh'),
      lifecycle,
      submitted,
    })
    ctx.swapData.id = 'self-paid-authorization'
    ctx.depositActions.push({ type: 'transfer', step: 'publish', status: 'waiting' })
    ctx.onSuccess = () => assert.fail('publication is still required')
    const authorization = executeGaslessAuthorization(ctx, async () => '0xsig')
    if (fails) await assert.rejects(authorization, error => error === refusal)
    else await authorization
    assert.deepEqual(submitted, [])
    assert.equal(useGaslessPreferenceStore.getState().gaslessUnavailable, false)
    assert.ok(lifecycle.every(event => !event.step.endsWith('_submitted')))
    const { useGaslessAuthorizationStore } = await import('../dist/esm/stores/swapTransactionStore.js')
    assert.equal(useGaslessAuthorizationStore.getState().authorizations[ctx.swapData.id], undefined)
  })
}
