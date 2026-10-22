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

test('saved batch outcomes and user receipts cannot decide swap phase', () => {
  for (const saved of [
    { atomicBatchPending: true }, { atomicBatchUncertain: true },
    { storedWalletTransaction: { hash: '0x1', status: 'failed' } },
    { storedWalletTransaction: { hash: '0x1', status: 'pending' } },
  ]) {
    const awaiting = resolve(pendingSwap(), saved)
    assert.equal(awaiting.phase, SwapPhase.AwaitingUserDeposit)
    assert.equal(awaiting.isTerminal, false)
    assert.equal(awaiting.failureReason, undefined)
    const completed = resolve(pendingSwap({ status: 'completed', transactions: [
      { type: 'output', status: 'completed', transaction_hash: '0x2', amount: 1 },
    ] }), saved)
    assert.equal(completed.phase, SwapPhase.Completed)
  }
})

test('a terminal wallet batch failure without backend events enables failure recovery', () => {
  const failed = resolve(pendingSwap(), { atomicBatchFailed: true })
  assert.equal(failed.phase, SwapPhase.Failed)
  assert.equal(failed.showWithdrawScreen, false)
  assert.equal(failed.failureReason, 'transfer_failed')
  const completed = resolve(pendingSwap({ status: 'completed', transactions: [
    { type: 'output', status: 'completed', transaction_hash: '0x2', amount: 1 },
  ] }), { atomicBatchFailed: true })
  assert.equal(completed.phase, SwapPhase.Completed)
  assert.equal(resolve(pendingSwap({ transactions: [inputTx({ status: 'pending', confirmations: 0 })] }), {
    atomicBatchFailed: true,
  }).phase, SwapPhase.InputPending, 'an indexed input takes precedence over a saved wallet failure')
})

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

test('server-reported deposit completion shows processing only while the server reports it', () => {
  const completed = resolve(pendingSwap(), { depositCompleted: true })
  assert.equal(completed.showWithdrawScreen, false)
  assert.equal(completed.phase, SwapPhase.InputPending)
  assert.equal(completed.failureReason, undefined)
  assert.equal(completed.gaslessFailureStatus, undefined)

  const actionRequired = resolve(pendingSwap(), { depositCompleted: false })
  assert.equal(actionRequired.showWithdrawScreen, true)
  assert.equal(actionRequired.phase, SwapPhase.AwaitingUserDeposit)
})

test('an accepted provider withdrawal starts processing without a hash, while an uncertain submission does not', () => {
  const accepted = resolve(pendingSwap(), { providerSubmissionAccepted: true })
  assert.equal(accepted.phase, SwapPhase.InputPending)
  assert.equal(accepted.showWithdrawScreen, false)
  assert.equal(accepted.stepStatuses.input_transfer, 'current')
  assert.equal(accepted.stepStatuses.output_transfer, 'upcoming')
  const uncertain = resolve(pendingSwap(), { pendingSubmission: true })
  assert.equal(uncertain.phase, SwapPhase.AwaitingUserDeposit)
  assert.equal(uncertain.showWithdrawScreen, true)

  for (const swap of [
    pendingSwap({ status: 'failed' }), pendingSwap({ status: 'expired' }),
    pendingSwap({ status: 'pending_refund' }), pendingSwap({ status: 'refunded' }),
    pendingSwap({ transactions: [inputTx({ status: 'failed' })] }),
    pendingSwap({ status: 'completed', transactions: [inputTx(), { type: 'output', transaction_hash: '0x2', amount: 1 }] }),
  ]) {
    assert.equal(resolve(swap, { providerSubmissionAccepted: true }).phase, resolve(swap).phase,
      'backend outcomes remain authoritative after provider acceptance')
  }
})

test('active wallet handoff retains its controls without overriding fetched progress', () => {
  for (const swap of [
    pendingSwap(),
    pendingSwap({ transactions: [inputTx()] }),
    pendingSwap({ status: 'completed', transactions: [inputTx()] }),
    pendingSwap({ status: 'completed', transactions: [inputTx(), { type: 'output', transaction_hash: '0x2', amount: 1 }] }),
  ]) {
    const fetched = resolve(swap, { depositCompleted: true })
    const executing = resolve(swap, { depositCompleted: true, walletActionExecuting: true })
    assert.equal(executing.phase, fetched.phase)
    assert.deepEqual(executing.stepStatuses, fetched.stepStatuses)
    assert.equal(executing.showWithdrawScreen, true)
    assert.equal(fetched.showWithdrawScreen, false)
  }
})

test('active wallet execution cannot hide failures, expiry or refunds', () => {
  for (const swap of [
    pendingSwap({ status: 'failed' }), pendingSwap({ status: 'expired' }),
    pendingSwap({ status: 'pending_refund' }), pendingSwap({ status: 'refunded' }),
    pendingSwap({ transactions: [inputTx({ status: 'failed' })] }),
  ]) {
    const fetched = resolve(swap)
    const executing = resolve(swap, { walletActionExecuting: true })
    assert.equal(executing.phase, fetched.phase)
    assert.equal(executing.showWithdrawScreen, false)
  }
})

test('a failed status from the tx-status poll resolves a client-detected transfer failure', () => {
  const resolved = resolve(pendingSwap(), {
    storedWalletTransaction: { hash: '0x1', status: 'pending' },
    inputTxStatusFromApi: 'failed',
  })
  assert.equal(resolved.phase, SwapPhase.Failed)
  assert.equal(resolved.failureReason, 'transfer_failed')
})

test('an input transaction the API lists as failed is failed but not retryable from the widget', () => {
  const resolved = resolve(pendingSwap({ transactions: [inputTx({ status: 'failed' })] }))
  assert.equal(resolved.phase, SwapPhase.Failed)
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
  assert.equal(listedCompleted.phase, SwapPhase.OutputPending)
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

test('completed swaps retain a duration when input and output share a timestamp', () => {
  const start = '2026-09-25T10:00:00.000Z'
  for (const [end, expected] of [
    [start, 'Completed in <1s'],
    ['2026-09-25T10:00:00.750Z', 'Completed in <1s'],
    ['2026-09-25T10:00:01.000Z', 'Completed in 1s'],
    ['2026-09-25T10:01:10.000Z', 'Completed in 1m 10s'],
  ]) {
    const resolved = resolve({
      status: 'completed',
      transactions: [
        inputTx({ timestamp: start }),
        { type: 'output', status: 'completed', transaction_hash: '0x1', amount: 3.169, timestamp: end },
      ],
    })
    assert.equal(resolved.phase, SwapPhase.Completed)
    assert.equal(resolved.generalStatus.subTitle, expected)
  }
})

test('completion duration uses recorded creation dates when block timestamps are missing', () => {
  const resolved = resolve({
    status: 'completed',
    transactions: [
      inputTx({ created_date: '2026-09-25T10:00:00.000Z' }),
      { type: 'output', transaction_hash: '0x2', amount: 3.169, created_date: '2026-09-25T10:00:40.000Z' },
    ],
  })
  assert.equal(resolved.generalStatus.subTitle, 'Completed in 40s')
})

test('missing or inconsistent timestamps do not produce a fabricated completion duration', () => {
  for (const timestamp of [undefined, 'invalid', '2026-09-25T09:59:59.000Z']) {
    const resolved = resolve({
      status: 'completed',
      transactions: [
        inputTx({ timestamp: '2026-09-25T10:00:00.000Z' }),
        { type: 'output', transaction_hash: '0x2', amount: 3.169, timestamp },
      ],
    })
    assert.equal(resolved.generalStatus.subTitle, null)
  }
})
