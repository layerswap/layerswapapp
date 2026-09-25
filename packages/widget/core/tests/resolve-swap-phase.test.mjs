import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    // The resolver only reads the API status enums; keep the HTTP client (and its
    // browser-only dependency graph) out of this pure test.
    if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) {
      return {
        url: 'data:text/javascript,'
          + 'export const BackendTransactionStatus = { Completed: "completed", Failed: "failed", Initiated: "initiated", Pending: "pending" };'
          + 'export const TransactionStatus = { Completed: "completed", Failed: "failed", Pending: "pending" };'
          + 'export const TransactionType = { Input: "input", Output: "output", Refuel: "refuel", Refund: "refund" };',
        shortCircuit: true,
      }
    }
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
      return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
  },
})
after(() => hooks.deregister())

const { resolveSwapPhase, SwapPhase } = await import('../dist/esm/components/utils/resolveSwapPhase.js')

const inputTx = (overrides = {}) => ({
  type: 'input', status: 'completed', transaction_hash: '0x1', confirmations: 1, max_confirmations: 1, ...overrides,
})
const pendingSwap = (overrides = {}) => ({ status: 'user_transfer_pending', transactions: [], ...overrides })
const resolve = (swapDetails, extra = {}) => resolveSwapPhase({ swapDetails, refuel: undefined, ...extra })

test('a failed gasless authorization resolves the swap to failed, with the reason the retry UI needs', () => {
  const resolved = resolve(pendingSwap(), {
    storedWalletTransaction: { hash: '', status: 'pending' },
    gaslessFailureStatus: 'expired',
  })
  assert.equal(resolved.phase, SwapPhase.Failed)
  assert.equal(resolved.isTerminal, true)
  assert.equal(resolved.failureReason, 'gasless_deposit_failed')
  assert.equal(resolved.gaslessFailureStatus, 'expired')
  assert.equal(resolved.generalStatus.title, 'Transfer failed')
})

test('a pending gasless deposit without a failure stays input-pending with no failure reason', () => {
  const resolved = resolve(pendingSwap(), { storedWalletTransaction: { hash: '', status: 'pending' } })
  assert.equal(resolved.phase, SwapPhase.InputPending)
  assert.equal(resolved.failureReason, undefined)
  assert.equal(resolved.gaslessFailureStatus, undefined)
})

test('a failed status from the tx-status poll resolves a client-detected transfer failure', () => {
  const resolved = resolve(pendingSwap(), {
    storedWalletTransaction: { hash: '0x1', status: 'pending' },
    inputTxStatusFromApi: 'failed',
  })
  assert.equal(resolved.phase, SwapPhase.Failed)
  assert.equal(resolved.failureReason, 'transfer_failed')
})

test('a stored failed wallet transaction (reload after the poll) resolves the same transfer failure', () => {
  const resolved = resolve(pendingSwap(), { storedWalletTransaction: { hash: '0x1', status: 'failed' } })
  assert.equal(resolved.phase, SwapPhase.Failed)
  assert.equal(resolved.isTerminal, true)
  assert.equal(resolved.failureReason, 'transfer_failed')
})

test('an input transaction the API lists as failed is failed but not retryable from the widget', () => {
  const resolved = resolve(pendingSwap({ transactions: [inputTx({ status: 'failed' })] }))
  assert.equal(resolved.phase, SwapPhase.Failed)
  assert.equal(resolved.failureReason, undefined)
})

test('the API input transaction is authoritative over a stale stored failure', () => {
  const resolved = resolve(pendingSwap({ transactions: [inputTx()] }), {
    storedWalletTransaction: { hash: '0x1', status: 'failed' },
  })
  assert.notEqual(resolved.phase, SwapPhase.Failed)
  assert.equal(resolved.phase, SwapPhase.OutputPending)
  assert.equal(resolved.failureReason, undefined)
})

test('a transient stored failure yields to the input status the API reports afterwards', () => {
  const storedWalletTransaction = { hash: '0x1', status: 'failed' }
  // The tx-status poll now sees the transaction: the stored failure no longer applies, and the
  // input stays pending until the API lists it (as without a stored failure).
  for (const status of ['pending', 'completed']) {
    const polled = resolve(pendingSwap(), { storedWalletTransaction, inputTxStatusFromApi: status })
    assert.equal(polled.swapInputTxStatus, 'pending', status)
    assert.equal(polled.phase, SwapPhase.InputPending)
    assert.equal(polled.failureReason, undefined)
  }
  // The API lists the input transaction: Processing writes this status back over the stored failure.
  const listedPending = resolve(pendingSwap({ transactions: [inputTx({ status: 'pending', confirmations: 0 })] }), { storedWalletTransaction })
  assert.equal(listedPending.swapInputTxStatus, 'pending')
  assert.equal(listedPending.phase, SwapPhase.InputPending)
  const listedCompleted = resolve(pendingSwap({ transactions: [inputTx()] }), { storedWalletTransaction, inputTxStatusFromApi: 'failed' })
  assert.equal(listedCompleted.swapInputTxStatus, 'completed')
  assert.equal(listedCompleted.failureReason, undefined)
})

test('the API swap status wins over a stored failure', () => {
  const resolved = resolve(pendingSwap({ status: 'expired' }), { storedWalletTransaction: { hash: '0x1', status: 'failed' } })
  assert.equal(resolved.phase, SwapPhase.Expired)
  assert.equal(resolved.isTerminal, true)
})

test('a swap the API failed after its input completed carries no client failure reason', () => {
  const resolved = resolve(pendingSwap({ status: 'failed', transactions: [inputTx()] }))
  assert.equal(resolved.phase, SwapPhase.Failed)
  assert.equal(resolved.failureReason, undefined)
})
