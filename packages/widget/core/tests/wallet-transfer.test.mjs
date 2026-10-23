import assert from 'node:assert/strict'
import test, { after, afterEach } from 'node:test'
import { createRequire, registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import ts from 'typescript'
import { ActionMessageType } from '@layerswap/widget-types'
import { userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) {
      return { url: 'data:text/javascript,export const BackendTransactionStatus = { Pending: "pending", Failed: "failed" }; export const TransactionType = { Input: "input" }', shortCircuit: true }
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

const require = createRequire(import.meta.url)
function loadAdapterSource(path, imports) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)(name => {
    if (name in imports) return imports[name]
    return require(name)
  }, module, module.exports)
  return module.exports
}

function calldataContext(callData, network) {
  return {
    swapData: { id: 'swap-calldata', metadata: {} },
    swapBasicData: { source_network: network, source_token: { decimals: 6 } },
    depositActions: [{ type: 'transfer', amount: 1, to_address: 'destination', call_data: callData }],
    selectedWallet: { address: 'source' },
    setActionStateText() {}, setSwapTransaction() {}, onSuccess() {}, onLifecycle() {},
    layerswapApiClient: { SwapCatchup: async () => {} },
  }
}

for (const [callData, expectedMemo] of [[null, ''], [undefined, ''], ['', ''], ['swap memo', '73776170206d656d6f'], ['0x', '3078']]) {
  test(`Tron preserves the memo bytes of deposit calldata ${JSON.stringify(callData)}`, async () => {
    const memos = []
    const { createTronTransfer } = loadAdapterSource('../../../wallets/adapters/tron/src/transferProvider/createTronTransfer.ts', {
      tronweb: { TronWeb: class {
        transactionBuilder = { addUpdateData: async (transaction, data, format, options) => {
          assert.deepEqual(options, { txLocal: true })
          memos.push([data, format])
          return transaction
        } }
        trx = { sendRawTransaction: async () => callData === 'swap memo' ? ({ result: false, code: 'DUP_TRANSACTION_ERROR' }) : callData === '0x' ? ({ result: false, code: 5 }) : ({ result: true }) }
      } },
      './transactionBuilder': { buildInitialTransaction: async () => ({ txID: 'tron-hash' }) },
      './toTransferError': { toTransferError: error => error },
      '../tronGasProvider': { TronGasProvider: class { async getGas() { return {} } } },
      '@layerswap/utils': { KnownInternalNames: { Networks: { TronMainnet: 'TRON_MAINNET', TronTestnet: 'TRON_TESTNET' } } },
      '../service/tronAdapterManager': { tronAdapterManager: {
        getActiveAdapter: () => ({}), signTransaction: async transaction => transaction,
      } },
    })
    const ctx = calldataContext(callData, { name: 'TRON_MAINNET', type: 'tron' })
    assert.equal(await executeWalletTransfer(ctx, createTronTransfer().executeTransfer), 'tron-hash')
    assert.deepEqual(memos, [[expectedMemo, 'hex']])
  })
}

for (const [callData, expectedData] of [[null, '0x'], [undefined, '0x'], ['', '0x'], ['0x1234', '0x1234']]) {
  test(`EVM normalizes deposit calldata ${JSON.stringify(callData)} at the adapter boundary`, async () => {
    const { transactionBuilder } = loadAdapterSource('../../../wallets/adapters/evm/src/transferProvider/transactionBuilder.ts', {
      viem: { parseEther: () => 0n },
      '../gasProviders/estimateTransferFee': { estimateTransferFee: async () => ({ gas: 21000n, fee: 1n, fees: { gasPrice: 1n }, client: { getBalance: async () => 100n } }) },
    })
    const ctx = calldataContext(callData, { name: 'ETHEREUM_MAINNET', type: 'evm', chain_id: '1' })
    await executeWalletTransfer(ctx, async props => {
      const transaction = await transactionBuilder(props)
      assert.equal(transaction.data, expectedData)
      return 'evm-hash'
    })
  })
}

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
    // A failed refresh is an API failure between two wallet requests: it opens no prompt and
    // is not a wallet action outcome; the operation still ends, as failed.
    assert.deepEqual(lifecycle.map(event => event.step), [
      'wallet_prompt_opened',
      ...(retried ? [
        'wallet_prompt_opened',
        result === 'success' ? 'transaction_submitted' : result === 'rejected' ? 'wallet_action_rejected' : 'wallet_action_failed',
      ] : []),
    ])
    assert.equal(operations.length, 1, 'one operation covers the refresh and both wallet waits')
    assert.equal(operations[0].attributes.operation, 'wallet_transfer')
    assert.equal(operations[0].attributes.outcome, result === 'success' ? 'succeeded' : result === 'rejected' ? 'rejected' : 'failed')
    assert.equal(operations[0].attributes.reason_code, retried ? undefined : 'deposit_action_refresh_failed')
    assert.equal(successes, result === 'success' ? 1 : 0)
    assert.deepEqual(published, result === 'success' ? [['swap-stellar', 'pending', 'stellar-hash']] : [])
    assert.deepEqual(catchups, result === 'success' ? [['swap-stellar', 'stellar-hash']] : [])
  })
}

const { toTransferError: starknetTransferError } = loadAdapterSource('../../../wallets/adapters/starknet/src/transferProvider/toTransferError.ts', {})

for (const [label, thrown, expected] of [
  ['adapter-declared decline', userRejectedError({ cause: { code: 4001 } }), { step: 'wallet_action_rejected', outcome: 'rejected', reasonCode: 'user_rejected', reason: 'Transaction rejected', errorCode: '4001' }],
  ['rejected label without a declared reason', walletActionError(ActionMessageType.TransactionRejected, { message: 'Execute failed' }), { step: 'wallet_action_failed', outcome: 'failed', reasonCode: 'unknown_error', reason: 'Execute failed' }],
  ['Braavos execution failure', starknetTransferError(new Error('Execute failed')), { step: 'wallet_action_failed', outcome: 'failed', reasonCode: 'unknown_error', reason: 'Execute failed' }],
  ['Ready X unknown RPC failure', starknetTransferError({ code: 163, message: 'UNKNOWN_ERROR' }), { step: 'wallet_action_failed', outcome: 'failed', reasonCode: 'unknown_error', reason: 'UNKNOWN_ERROR', errorCode: '163' }],
  ['OKX authorization failure', starknetTransferError({ code: 4100, message: 'Unauthorized' }), { step: 'wallet_action_failed', outcome: 'failed', reasonCode: 'unauthorized', reason: 'Unauthorized', errorCode: '4100' }],
]) {
  test(`wallet transfer outcome follows the declared reason, not the UI label: ${label}`, async t => {
    const lifecycle = []
    const operations = []
    t.after(widgetTelemetry.register(event => operations.push(event)))
    const action = { type: 'transfer', amount: '1', to_address: 'deposit', from_address: 'source', call_data: 'calldata' }
    const ctx = {
      swapData: { id: 'swap-label', source_address: 'source', metadata: {} },
      swapBasicData: { requested_amount: '1', source_network: { name: 'STARKNET_MAINNET' } },
      depositActions: [action], selectedWallet: { providerName: 'Starknet', address: 'wallet-source' },
      sourceAddress: 'source', setActionStateText() {},
      setSwapTransaction: () => assert.fail('nothing is published'), onSuccess: () => assert.fail('no success'),
      onLifecycle: event => lifecycle.push(event),
      layerswapApiClient: { GetDepositActionsAsync: async () => assert.fail('no refresh'), SwapCatchup: async () => assert.fail('no catchup') },
    }
    await assert.rejects(executeWalletTransfer(ctx, async () => { throw thrown }), error => error === thrown)
    assert.deepEqual(lifecycle.map(event => event.step), ['wallet_prompt_opened', expected.step])
    const failure = lifecycle.at(-1)
    assert.equal(failure.outcome, expected.outcome)
    assert.equal(failure.reasonCode, expected.reasonCode)
    assert.equal(failure.reason, expected.reason)
    assert.equal(failure.errorCode, expected.errorCode)
    assert.equal(operations.length, 1)
    assert.equal(operations[0].attributes.operation, 'wallet_transfer')
    assert.equal(operations[0].attributes.outcome, expected.outcome)
  })
}

for (const hash of ['transaction-hash', '', undefined]) {
  test(`standard transfers require a hash and report one terminal outcome: ${JSON.stringify(hash)}`, async t => {
    const lifecycle = []
    const operations = []
    const published = []
    let successes = 0
    t.after(widgetTelemetry.register(event => operations.push(event)))
    const ctx = {
      swapData: { id: 'swap-standard', metadata: {} },
      swapBasicData: { requested_amount: '1', source_network: { name: 'ETHEREUM_MAINNET' } },
      depositActions: [{ type: 'transfer', amount: '1', to_address: 'deposit' }],
      selectedWallet: { providerName: 'EVM', address: 'source' },
      setActionStateText() {},
      setSwapTransaction: (...args) => published.push(args), onSuccess: () => { successes++ },
      onLifecycle: event => lifecycle.push(event),
      layerswapApiClient: {
        GetDepositActionsAsync: async () => assert.fail('no refresh'),
        SwapCatchup: async (swapId, transactionHash) => {
          assert.equal(swapId, 'swap-standard')
          assert.equal(transactionHash, hash)
        },
      },
    }
    const transfer = executeWalletTransfer(ctx, async () => hash)
    if (hash) await transfer
    else await assert.rejects(transfer, /Wallet returned no transaction hash/)
    assert.deepEqual(lifecycle.map(event => event.step), [
      'wallet_prompt_opened', hash ? 'transaction_submitted' : 'wallet_action_failed',
    ])
    assert.equal(lifecycle[1].reasonCode, hash ? undefined : 'missing_transaction_hash')
    assert.equal(lifecycle[1].transactionHash, hash || undefined)
    assert.equal(operations.length, 1)
    assert.equal(operations[0].attributes.outcome, hash ? 'succeeded' : 'failed')
    assert.equal(operations[0].attributes.reason_code, hash ? undefined : 'missing_transaction_hash')
    assert.equal(successes, hash ? 1 : 0)
    assert.deepEqual(published, hash ? [['swap-standard', 'pending', hash]] : [])
  })
}

const { useSwapTransactionStore } = await import('../dist/esm/stores/swapTransactionStore.js')
afterEach(() => useSwapTransactionStore.setState({ pendingSubmissions: {}, swapTransactions: {} }))
test('a preparation RPC timeout cannot leave an uncertain broadcast marker', async () => {
  const ctx = { ...calldataContext('0x', { name: 'ETHEREUM_MAINNET' }), swapData: { id: 'prepare-timeout', metadata: {} } }
  await assert.rejects(executeWalletTransfer(ctx, async props => {
    props.onSubmissionStateChange?.('preparing')
    throw new Error('RPC timeout')
  }), /RPC timeout/)
  assert.equal(useSwapTransactionStore.getState().pendingSubmissions['prepare-timeout'], undefined)
})

for (const phase of [undefined, 'preparing', 'not_submitted']) test(`a definitive ${phase} failure remains retryable`, async () => {
  const id = `definite-${phase}`
  const ctx = { ...calldataContext('0x', { name: 'ETHEREUM_MAINNET' }), swapData: { id, metadata: {} } }
  await assert.rejects(executeWalletTransfer(ctx, async props => {
    if (phase) props.onSubmissionStateChange?.(phase)
    throw new Error('RPC timeout')
  }), /RPC timeout/)
  assert.equal(useSwapTransactionStore.getState().pendingSubmissions[id], undefined)
})

test('a timeout after refreshing an expired request preserves the wallet error', async () => {
  const id = 'refreshed-timeout'
  const ctx = { ...calldataContext('original', { name: 'STELLAR_MAINNET' }), swapData: { id, metadata: {} },
    layerswapApiClient: { GetDepositActionsAsync: async () => ({ data: [{ type: 'transfer', amount: 1, to_address: 'deposit', call_data: 'fresh' }] }) },
  }
  await assert.rejects(executeWalletTransfer(ctx, async props => {
    if (props.callData === 'original') throw Object.assign(new Error('Expired'), { name: ActionMessageType.TransactionExpired })
    props.onSubmissionStateChange?.('submitting')
    throw new Error('Response timeout')
  }), /Response timeout/)
  assert.equal(useSwapTransactionStore.getState().pendingSubmissions[id], undefined)
})

for (const error of [Object.assign(new Error('HTTP 429'), { code: 4200 }), new Error('Failed to fetch'), new Error('RPC timeout')]) {
  test(`an unphased preparation failure remains retryable: ${error.message}`, async () => {
    const id = `unphased-${error.message}`
    const ctx = { ...calldataContext('0x', { name: 'SOLANA_MAINNET' }), swapData: { id, metadata: {} } }
    let calls = 0
    const send = async () => { calls++; throw error }
    await assert.rejects(executeWalletTransfer(ctx, send), e => e === error)
    assert.equal(useSwapTransactionStore.getState().pendingSubmissions[id], undefined)
    await assert.rejects(executeWalletTransfer(ctx, send), e => e === error)
    assert.equal(calls, 2)
  })
}

test('native final fee reaches recovery without marking preparation as submitted', async () => {
  const id = 'contract-budget'
  const ctx = { ...calldataContext('0x', { name: 'ETHEREUM_MAINNET' }), swapData: { id, metadata: {} } }
  let received
  const fee = { gas: 0.00012, token: { symbol: 'ETH' } }
  await assert.rejects(executeWalletTransfer({ ...ctx, onFeeEstimate: value => { received = value } }, async props => {
    props.onSubmissionStateChange?.('preparing')
    props.onFeeEstimate(fee)
    throw Object.assign(new Error('Insufficient funds'), { code: 'INSUFFICIENT_FUNDS' })
  }), /Insufficient funds/)
  assert.equal(received, fee)
  assert.equal(useSwapTransactionStore.getState().pendingSubmissions[id], undefined)
})

for (const failure of ['timeout', 'network', 'unknown', 'missing-hash', 'unphased-missing-hash']) test(`ambiguous submitting ${failure} does not trigger status lookup or another wallet request`, async () => {
  const id = `ambiguous-${failure}`
  let sends = 0, checks = 0
  const ctx = {
    ...calldataContext('0x', { name: 'ETHEREUM_MAINNET' }), swapData: { id, metadata: {} },
    layerswapApiClient: { GetSwapAsync: async () => { checks++; return { data: { swap: { id, transactions: [] } } } } },
  }
  await assert.rejects(executeWalletTransfer(ctx, async props => {
    sends++
    if (failure !== 'unphased-missing-hash') props.onSubmissionStateChange?.('submitting')
    if (failure.endsWith('missing-hash')) return undefined
    throw new Error(failure === 'timeout' ? 'Wallet timeout' : failure === 'network' ? 'Failed to fetch' : 'Unexpected wallet response')
  }), error => error.message === (failure.endsWith('missing-hash') ? 'Wallet returned no transaction hash' : failure === 'timeout' ? 'Wallet timeout' : failure === 'network' ? 'Failed to fetch' : 'Unexpected wallet response'))
  assert.equal(sends, 1)
  assert.equal(checks, 0)
})

for (const failure of [Object.assign(new Error('User rejected request'), { code: 4001 }), new Error('Insufficient funds'), new Error('Execution reverted')]) test(`definitive submitting failure stays an ordinary error: ${failure.message}`, async () => {
  const ctx = { ...calldataContext('0x', { name: 'ETHEREUM_MAINNET' }),
    layerswapApiClient: { GetSwapAsync: () => assert.fail('No reconciliation') },
  }
  await assert.rejects(executeWalletTransfer(ctx, async props => {
    props.onSubmissionStateChange?.('submitting')
    throw failure
  }), error => error === failure)
})

for (const status of ['pending', 'completed']) test(`a recorded ${status} hash resumes locally without a wallet or API request`, async () => {
  const id = `known-${status}`
  useSwapTransactionStore.getState().setSwapTransaction(id, status, 'recorded-hash')
  let successes = 0
  const ctx = { ...calldataContext('0x', { name: 'ETHEREUM_MAINNET' }),
    swapData: { id, metadata: {} }, depositActions: [], onSuccess: () => { successes++ },
    layerswapApiClient: { GetSwapAsync: () => assert.fail('No status request') },
  }
  assert.equal(await executeWalletTransfer(ctx, () => assert.fail('No wallet request')), 'recorded-hash')
  assert.equal(successes, 1)
})
