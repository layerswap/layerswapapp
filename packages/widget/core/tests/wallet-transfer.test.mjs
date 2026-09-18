import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { ActionMessageType } from '@layerswap/widget-types'

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
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
const { executeWalletTransfer } = await import('../dist/esm/components/Pages/Swap/Withdraw/Wallet/Common/depositExecution.js')
const { widgetTelemetry } = await import('../dist/esm/lib/widgetTelemetry.js')

for (const result of ['success', 'rejected', 'expired-again', 'refresh-failed', 'empty-refresh']) {
  test(`expired Stellar transfer refreshes once and reports prompts/timing: ${result}`, async t => {
    const lifecycle = []
    const operations = []
    const published = []
    const catchups = []
    const prompts = []
    let successes = 0
    let refreshes = 0
    const expired = Object.assign(new Error('Expired Stellar transaction'), { name: ActionMessageType.TransactionExpired })
    const rejected = Object.assign(new Error('User declined'), { code: 4001 })
    const refreshError = new Error('Refresh failed')
    const action = { type: 'transfer', amount: '1', to_address: 'deposit', from_address: 'source', call_data: 'original-xdr' }
    t.after(widgetTelemetry.register(event => operations.push(event)))
    const ctx = {
      swapData: { id: 'swap-stellar', source_address: 'source', metadata: {} },
      swapBasicData: { requested_amount: '1', source_network: { name: 'STELLAR_MAINNET' } },
      depositActions: [action], selectedWallet: { providerName: 'Stellar', address: 'wallet-source' },
      sourceAddress: 'source', setActionStateText() {},
      setSwapTransaction: (...args) => published.push(args), onSuccess: () => { successes++ },
      onLifecycle: event => lifecycle.push(event),
      layerswapApiClient: {
        GetDepositActionsAsync: async (...args) => {
          refreshes++
          assert.deepEqual(args, ['swap-stellar', 'source'])
          if (result === 'refresh-failed') throw refreshError
          return { data: result === 'empty-refresh' ? [] : [{ ...action, call_data: 'fresh-xdr' }] }
        },
        SwapCatchup: async (...args) => { catchups.push(args) },
      },
    }
    const transfer = executeWalletTransfer(ctx, async props => {
      prompts.push(props.callData)
      assert.equal(lifecycle.at(-1).step, 'wallet_prompt_opened', 'every wallet call has a prompt event')
      if (prompts.length === 1 || result === 'expired-again') throw expired
      if (result === 'rejected') throw rejected
      return 'stellar-hash'
    })
    if (result === 'success') await transfer
    else await assert.rejects(transfer, error => {
      if (result === 'empty-refresh') return /Could not refresh/.test(error.message)
      return error === (result === 'rejected' ? rejected : result === 'refresh-failed' ? refreshError : expired)
    })
    assert.equal(refreshes, 1)
    const retried = !['refresh-failed', 'empty-refresh'].includes(result)
    assert.deepEqual(prompts, retried ? ['original-xdr', 'fresh-xdr'] : ['original-xdr'])
    assert.deepEqual(lifecycle.map(event => event.step), [
      'wallet_prompt_opened', ...(retried ? ['wallet_prompt_opened'] : []),
      result === 'success' ? 'transaction_submitted' : result === 'rejected' ? 'wallet_action_rejected' : 'wallet_action_failed',
    ])
    assert.equal(operations.length, 1, 'one operation covers the refresh and both wallet waits')
    assert.equal(operations[0].attributes.operation, 'wallet_transfer')
    assert.equal(operations[0].attributes.outcome, result === 'success' ? 'succeeded' : result === 'rejected' ? 'rejected' : 'failed')
    assert.equal(successes, result === 'success' ? 1 : 0)
    assert.deepEqual(published, result === 'success' ? [['swap-stellar', 'pending', 'stellar-hash']] : [])
    assert.deepEqual(catchups, result === 'success' ? [['swap-stellar', 'stellar-hash']] : [])
  })
}
