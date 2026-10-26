import assert from 'node:assert/strict'
import test, { after } from 'node:test'
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
const { resolveAtomicDepositActions } = await import('../dist/esm/lib/atomicBatchActions.js')
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

test('a sufficient-allowance backend transfer with only base units submits one zero-value transaction', async () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/atomic-batch.json', import.meta.url)))
  const publication = fixture.deposit_actions.sufficient_allowance[0]
  assert.equal(publication.amount, undefined)
  const actions = await resolveAtomicDepositActions([publication], async () => ({
    step: 'publish', status: 'action_required', action: publication,
  }))
  const { transactionBuilder } = loadAdapterSource('../../../wallets/adapters/evm/src/transferProvider/transactionBuilder.ts', {
    './resolveEVMTransactionRequest': loadAdapterSource('../../../wallets/adapters/evm/src/transferProvider/resolveEVMTransactionRequest.ts', {}),
    '../gasProviders/resolveEVMTransactionGasParameters': { resolveEVMTransactionGasParameters: async () => undefined },
  })
  const transactions = [], receipts = [], catchups = []
  let successes = 0
  const ctx = {
    swapData: { id: 'sufficient-allowance', metadata: {} },
    swapBasicData: fixture.swap, depositActions: actions,
    selectedWallet: { address: fixture.account },
    setActionStateText() {}, onLifecycle() {},
    setSwapTransaction: (...args) => receipts.push(args),
    onSuccess: () => { successes++ },
    layerswapApiClient: { SwapCatchup: async (...args) => { catchups.push(args) } },
  }
  await executeWalletTransfer(ctx, async props => {
    transactions.push(await transactionBuilder(props))
    return 'intake-hash'
  })
  assert.equal(transactions.length, 1)
  assert.equal(transactions[0].value, 0n)
  assert.equal(transactions[0].to, publication.to_address)
  assert.equal(transactions[0].data, publication.call_data)
  assert.deepEqual(receipts, [['sufficient-allowance', 'intake-hash', 'frontend-swap']])
  assert.deepEqual(catchups, [['sufficient-allowance', 'intake-hash']])
  assert.equal(successes, 1)
})

for (const [callData, expectedMemo] of [[null, ''], [undefined, ''], ['', ''], ['swap memo', '73776170206d656d6f'], ['0x', '3078']]) {
  test(`Tron preserves the memo bytes of deposit calldata ${JSON.stringify(callData)}`, async () => {
    const memos = []
    const { createTronTransfer } = loadAdapterSource('../../../wallets/adapters/tron/src/transferProvider/createTronTransfer.ts', {
      tronweb: { TronWeb: class {
        transactionBuilder = { addUpdateData: async (transaction, data, format) => {
          memos.push([data, format])
          return transaction
        } }
        trx = { sendRawTransaction: async () => ({ result: true }) }
      } },
      './transactionBuilder': { buildInitialTransaction: async () => ({ txID: 'tron-hash' }) },
      './toTransferError': { toTransferError: error => error },
      './tronBroadcast.js': loadAdapterSource('../../../wallets/adapters/tron/src/transferProvider/tronBroadcast.ts', {}),
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
      './resolveEVMTransactionRequest': loadAdapterSource('../../../wallets/adapters/evm/src/transferProvider/resolveEVMTransactionRequest.ts', {}),
      '../gasProviders/resolveEVMTransactionGasParameters': { resolveEVMTransactionGasParameters: async () => undefined },
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
      // The transfer resolver signals the request for a provider without preparation of its own.
      props.onWalletRequest()
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
    assert.deepEqual(published, result === 'success' ? [['swap-stellar', 'stellar-hash', 'wallet-transfer']] : [])
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

for (const [label, signalsWalletRequest] of [['a provider that signals its wallet request', true], ['a provider without preparation', false]]) {
  test(`the wallet transfer operation reports provider preparation apart from the wallet wait: ${label}`, async t => {
    const operations = []
    const lifecycle = []
    t.after(widgetTelemetry.register(event => operations.push(event)))
    const action = { type: 'transfer', amount: '1', to_address: 'deposit', from_address: 'source', call_data: 'calldata' }
    const ctx = {
      swapData: { id: 'swap-prep', source_address: 'source', metadata: {} },
      swapBasicData: { requested_amount: '1', source_network: { name: 'MONAD_MAINNET' } },
      depositActions: [action], selectedWallet: { providerName: 'EVM', address: 'wallet-source' },
      sourceAddress: 'source', setActionStateText() {}, setSwapTransaction: async () => {}, onSuccess() {},
      onLifecycle: event => lifecycle.push(event.step),
      layerswapApiClient: { GetDepositActionsAsync: async () => assert.fail('no refresh'), SwapCatchup: async () => {} },
    }
    await executeWalletTransfer(ctx, async props => {
      if (signalsWalletRequest) {
        await new Promise(resolve => setTimeout(resolve, 5))
        assert.deepEqual(lifecycle, [], 'preparation is not a wallet prompt')
        props.onWalletRequest()
        assert.deepEqual(lifecycle, ['wallet_prompt_opened'], 'the prompt is reported when the wallet is asked')
        props.onWalletRequest()
      }
      return 'hash'
    })
    assert.deepEqual(lifecycle, ['wallet_prompt_opened', 'transaction_submitted'], 'a request that never signals still reports the prompt before its outcome')
    assert.equal(operations.length, 1)
    assert.equal(operations[0].attributes.outcome, 'succeeded')
    const preparation = operations[0].attributes.adapter_preparation_ms
    if (signalsWalletRequest) assert.ok(Number.isInteger(preparation) && preparation >= 5, `preparation ${preparation}`)
    else assert.equal(preparation, undefined)
  })
}

const { TransferResolver } = await import('../dist/esm/lib/transfers/transferResolver.js')

test('the transfer resolver signals the wallet request for providers that do not report it themselves', async () => {
  const calls = []
  const provider = (reportsWalletRequest, name) => ({
    reportsWalletRequest, supportsNetwork: network => network.name === name,
    async executeTransfer(params) { calls.push(`${name}:execute`); if (reportsWalletRequest) params.onWalletRequest?.(); return 'hash' },
  })
  const resolver = new TransferResolver([provider(true, 'prepares'), provider(false, 'direct')])
  for (const name of ['prepares', 'direct']) {
    await resolver.executeTransfer({ network: { name }, onWalletRequest: () => calls.push(`${name}:request`) })
  }
  assert.deepEqual(calls, ['prepares:execute', 'prepares:request', 'direct:request', 'direct:execute'])
})

const { useSwapTransactionStore } = await import('../dist/esm/stores/swapTransactionStore.js')

for (const [label, record, transactionStatus, expectWalletRequest] of [
  ['a recorded deposit hash', store => store.setSwapTransaction('swap-dup', 'recorded-hash', 'wallet-transfer'), undefined, false],
  ['a pending provider submission', store => store.markSubmissionPending('swap-dup'), undefined, false],
  ['a recorded hash whose transaction failed on chain', store => store.setSwapTransaction('swap-dup', 'recorded-hash', 'wallet-transfer'), { hash: 'recorded-hash', status: 'failed' }, true],
]) {
  test(`a transfer request reads the store at wallet time and never asks for a second deposit: ${label}`, async t => {
    const operations = []
    const lifecycle = []
    const published = []
    let prompts = 0
    let successes = 0
    t.after(widgetTelemetry.register(event => operations.push(event)))
    t.after(() => useSwapTransactionStore.setState({ swapTransactions: {}, pendingSubmissions: {} }))
    const ctx = {
      swapData: { id: 'swap-dup', metadata: {} },
      swapBasicData: { requested_amount: '1', source_network: { name: 'ETHEREUM_MAINNET' } },
      depositActions: [{ type: 'transfer', amount: '1', to_address: 'deposit' }],
      selectedWallet: { providerName: 'EVM', address: 'source' },
      transactionStatus: undefined, inputTransactionStatus: transactionStatus,
      setActionStateText() {},
      setSwapTransaction: (...args) => published.push(args), onSuccess: () => { successes++ },
      onLifecycle: event => lifecycle.push(event),
      layerswapApiClient: { GetDepositActionsAsync: async () => assert.fail('no refresh'), SwapCatchup: async () => {} },
    }
    // The receipt arrived after this handler captured its swap data and before it reached the wallet.
    record(useSwapTransactionStore.getState())
    const hash = await executeWalletTransfer(ctx, async () => { prompts++; return 'second-hash' })
    assert.equal(prompts, expectWalletRequest ? 1 : 0)
    if (expectWalletRequest) return
    assert.equal(hash, label.includes('pending') ? '' : 'recorded-hash')
    assert.deepEqual(published, [], 'the stale handler records nothing')
    assert.equal(successes, 0, 'the stale handler hands off nothing')
    assert.deepEqual(lifecycle, [], 'no prompt was opened')
    assert.equal(operations.length, 1)
    assert.equal(operations[0].attributes.outcome, 'cancelled')
    assert.equal(operations[0].attributes.reason_code, 'deposit_already_submitted')
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
    assert.deepEqual(published, hash ? [['swap-standard', hash, 'wallet-transfer']] : [])
  })
}
