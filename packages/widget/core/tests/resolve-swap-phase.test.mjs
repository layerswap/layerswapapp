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

test('server-reported deposit completion shows processing only while the server reports it', () => {
  const completed = resolve(pendingSwap(), { depositCompleted: true })
  assert.equal(completed.showWithdrawScreen, false)
  assert.equal(completed.phase, SwapPhase.InputPending)

  const actionRequired = resolve(pendingSwap(), { depositCompleted: false })
  assert.equal(actionRequired.showWithdrawScreen, true)
  assert.equal(actionRequired.phase, SwapPhase.AwaitingUserDeposit)
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

for (const outcome of ['unindexed', 'completed']) {
  test(`background polling discovers ${outcome} progress after a wallet timeout`, async () => {
    const React = await import('react')
    const { act, createElement } = React
    const { JSDOM } = await import('jsdom')
    const dom = new JSDOM('<div id="root"></div>', { url: 'https://widget.example' })
    const previous = Object.getOwnPropertyDescriptors(globalThis)
    const globals = { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true }
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
    const { createRoot } = await import('react-dom/client')
    const { default: useSWR, SWRConfig, useSWRConfig } = await import('swr')
    const { createSwapContext } = await import('./helpers/swap-context.mjs')
    const { executeWalletTransfer } = await import('../dist/esm/components/Pages/Swap/Withdraw/Wallet/Common/depositExecution.js')
    const id = `timeout-ui-${outcome}`
    const cacheKey = `/swaps/${id}?exclude_deposit_actions=true`
    const cache = new Map()
    const token = { symbol: 'ETH', decimals: 18 }
    const network = { name: 'BASE_MAINNET', token }
    const pending = { id, metadata: {}, status: 'user_transfer_pending', source_network: network, source_token: token, destination_network: network, destination_token: token, transactions: [], use_deposit_address: false, requested_amount: 1 }
    const observed = { ...pending, status: outcome === 'completed' ? 'completed' : 'user_transfer_pending', transactions: outcome === 'unindexed' ? [{ type: 'input', status: 'pending', transaction_hash: '', confirmations: 0, max_confirmations: 1 }] : [] }
    const context = createSwapContext({
      Client: class {}, getSwapId: () => id, getAccount: () => ({ id: 'wallet', address: 'source' }),
      overrides: {
        '@/components/utils/resolveSwapPhase': { resolveSwapPhase },
        '@/hooks/useSwapPolling': { useSwapPolling: swapId => useSWR(swapId ? `/swaps/${swapId}?exclude_deposit_actions=true` : null, null, { fallbackData: { data: { swap: pending } } }) },
      },
    })
    let data, mutate, sends = 0, successes = 0
    function Probe() {
      data = context.useSwapDataState()
      mutate = useSWRConfig().mutate
      return createElement('output', null, data.resolved.showWithdrawScreen ? 'withdraw' : 'progress')
    }
    const root = createRoot(document.getElementById('root'))
    try {
      await act(() => root.render(createElement(SWRConfig, { value: { provider: () => cache } },
        createElement(context.SwapDataProvider, null, createElement(Probe)))))
      assert.equal(document.querySelector('output').textContent, 'withdraw')
      await act(async () => {
        await assert.rejects(executeWalletTransfer({
          swapData: pending, swapBasicData: pending, selectedWallet: { address: 'source' },
          depositActions: [{ type: 'transfer', amount: 1, to_address: 'deposit' }],
          layerswapApiClient: { GetSwapAsync: () => assert.fail('No timeout-triggered status request') },
          setActionStateText() {}, setSwapTransaction: () => assert.fail('Hashless progress must not invent a transaction'),
          onSuccess: () => { successes++ }, onLifecycle() {},
        }, async () => { sends++; throw Object.assign(new Error('Wallet timeout'), { code: 'ETIMEDOUT' }) }), /Wallet timeout/)
      })
      assert.equal(sends, 1)
      assert.equal(successes, 0)
      assert.equal(document.querySelector('output').textContent, 'withdraw')
      // Simulate the existing poll publishing its next API snapshot.
      await act(async () => { await mutate(cacheKey, { data: { swap: observed } }, { revalidate: false }) })
      assert.equal(data.swapDetails, observed)
      assert.equal(data.resolved.showWithdrawScreen, false)
      assert.equal(document.querySelector('output').textContent, 'progress')
    } finally {
      await act(() => root.unmount())
      dom.window.close()
      for (const key of Object.keys(globals)) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]
      }
    }
  })
}
