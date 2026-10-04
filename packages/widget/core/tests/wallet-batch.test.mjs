import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(path, imports = {}, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', ...Object.keys(globals), outputText)(
    name => name in imports ? imports[name] : require(name), module, module.exports, ...Object.values(globals))
  return module.exports
}
const { resolveBatchStatus } = load('../src/lib/walletBatch.ts')
const address = `0x${'1'.repeat(40)}`
const hash = `0x${'a'.repeat(64)}`
const finalHash = `0x${'b'.repeat(64)}`
const isBatchOutstanding = batch => ['submitting', 'pending', 'unknown'].includes(batch?.state)
const network = { name: 'ARBITRUM_MAINNET', chain_id: '42161', type: 'evm' }
const wallet = { id: 'wallet', internalId: 'injected', providerName: 'EVM', address, addresses: [address], isActive: true }

function harness() {
  const batches = { batches: {}, setBatch(id, batch) { this.batches[id] = batch }, removeBatch(id) { delete this.batches[id] } }
  // Store actions are closure functions in Zustand, not methods bound to `this`.
  batches.setBatch = (id, batch) => { batches.batches[id] = batch }
  batches.removeBatch = id => { delete batches.batches[id] }
  const tx = { pendingSubmissions: {}, swapTransactions: {},
    markSubmissionPending(id) { tx.pendingSubmissions[id] = true },
    clearPendingSubmission(id) { delete tx.pendingSubmissions[id] },
    setSwapTransaction(id, status, hash) { tx.swapTransactions[id] = { status, hash }; delete tx.pendingSubmissions[id] },
  }
  const useWalletBatchStore = selector => selector(batches)
  useWalletBatchStore.getState = () => batches
  const lifecycle = []
  const imports = {
    '@/stores/walletBatchStore': { useWalletBatchStore, isBatchOutstanding },
    '@/stores/swapTransactionStore': { useSwapTransactionStore: { getState: () => tx },
      useDepositSignatureStore: { getState: () => ({ removeDepositSignature() {} }) } },
    './isUserRejection': { isUserRejection: error => error.code === 4001 },
    '@/lib/swapLifecycle': { lifecycleContextFromSwap: () => ({}), lifecycleErrorDetails: () => ({}) },
    '@/lib/widgetTelemetry': { widgetTelemetry: { beginOperation: () => () => {} } },
  }
  const { executeWalletBatch } = load('../src/components/Pages/Swap/Withdraw/Wallet/Common/batchExecution.ts', imports)
  const ctx = { swapData: { id: 'swap', source_address: address }, swapBasicData: { source_network: network },
    selectedWallet: wallet, setActionStateText() {}, onLifecycle: event => lifecycle.push(event), onSuccess() {} }
  const action = { type: 'batch_transfer', atomic_required: true, from_address: address, network,
    valid_before: Math.floor(Date.now() / 1000) + 300,
    calls: [0, 1, 2].map(index => ({ to_address: address, call_data: `0x0${index}`, amount_in_base_units: '0' })) }
  let submissions = 0
  const provider = { getCapabilities: async () => 'supported', sendCalls: async () => { submissions++; return { id: 'batch-id' } } }
  return { batches, tx, lifecycle, imports, executeWalletBatch, ctx, action, provider, submissions: () => submissions }
}

test('one grouped submission stores a batch ID without transaction telemetry or a tx hash', async () => {
  const h = harness()
  await h.executeWalletBatch(h.ctx, h.provider, h.action)
  assert.equal(h.submissions(), 1)
  assert.equal(h.batches.batches.swap.id, 'batch-id')
  assert.equal(h.batches.batches.swap.state, 'pending')
  assert.equal(h.tx.pendingSubmissions.swap, true)
  assert.deepEqual(h.tx.swapTransactions, {})
  assert.deepEqual(h.lifecycle.map(event => event.step), ['wallet_prompt_opened'])
  await assert.rejects(h.executeWalletBatch(h.ctx, h.provider, h.action), /outstanding/)
  assert.equal(h.submissions(), 1)
})

for (const capability of ['ready', 'unsupported']) test(`${capability} cannot open a batch prompt`, async () => {
  const h = harness()
  h.provider.getCapabilities = async () => capability
  await assert.rejects(h.executeWalletBatch(h.ctx, h.provider, h.action), /standard flow/)
  assert.equal(h.submissions(), 0)
  assert.equal(h.batches.batches.swap.standardNextAttempt, true)
  assert.deepEqual(h.tx.pendingSubmissions, {})
})

for (const outcome of ['rejection', 'timeout', 'missing-id', 'definite-refusal']) test(`submission ${outcome} preserves retry safety`, async () => {
  const h = harness()
  h.provider.sendCalls = async () => {
    assert.equal(h.tx.pendingSubmissions.swap, true, 'mark outstanding before opening the wallet')
    assert.equal(h.batches.batches.swap.state, 'submitting')
    if (outcome === 'missing-id') return {}
    throw Object.assign(new Error(outcome), outcome === 'rejection' ? { code: 4001 }
      : outcome === 'definite-refusal' ? { notSubmitted: true } : {})
  }
  await assert.rejects(h.executeWalletBatch(h.ctx, h.provider, h.action))
  const uncertain = ['timeout', 'missing-id'].includes(outcome)
  assert.equal(isBatchOutstanding(h.batches.batches.swap), uncertain)
  assert.equal(!!h.tx.pendingSubmissions.swap, uncertain)
  if (uncertain) await assert.rejects(h.executeWalletBatch(h.ctx, h.provider, h.action), /outstanding/)
  if (outcome === 'rejection') assert.equal(h.batches.batches.swap, undefined)
})

test('concurrent clicks can submit only once after their capability requests settle', async () => {
  const h = harness()
  const requests = [h.executeWalletBatch(h.ctx, h.provider, h.action), h.executeWalletBatch(h.ctx, h.provider, h.action)]
  const results = await Promise.allSettled(requests)
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(h.submissions(), 1)
})

test('a late unsupported capability response cannot overwrite another accepted batch', async () => {
  const h = harness()
  const capabilities = []
  h.provider.getCapabilities = () => new Promise(resolve => capabilities.push(resolve))
  const first = h.executeWalletBatch(h.ctx, h.provider, h.action)
  const second = h.executeWalletBatch(h.ctx, h.provider, h.action)
  const refused = assert.rejects(second, /outstanding/)
  capabilities[0]('supported')
  await first
  capabilities[1]('unsupported')
  await refused
  assert.equal(h.batches.batches.swap.id, 'batch-id')
  assert.equal(h.batches.batches.swap.state, 'pending')
  assert.equal(h.tx.pendingSubmissions.swap, true)
})

test('closing the screen while the prompt is open retains the late batch ID', async () => {
  const h = harness()
  const controller = new AbortController()
  h.ctx.signal = controller.signal
  let accept
  h.provider.sendCalls = () => new Promise(resolve => { accept = resolve })
  const submission = h.executeWalletBatch(h.ctx, h.provider, h.action)
  await new Promise(resolve => setImmediate(resolve))
  controller.abort()
  accept({ id: 'late-id' })
  await submission
  assert.equal(h.batches.batches.swap.id, 'late-id')
  assert.equal(h.tx.pendingSubmissions.swap, true)
})

for (const invalid of ['account', 'chain', 'expiry', 'empty', 'native-value', 'calldata']) test(`invalid ${invalid} is rejected before wallet access`, async () => {
  const h = harness()
  h.provider.getCapabilities = () => assert.fail('invalid batch must not query the wallet')
  if (invalid === 'account') h.action.from_address = `0x${'2'.repeat(40)}`
  if (invalid === 'chain') h.action.network = { ...network, chain_id: '1' }
  if (invalid === 'expiry') h.action.valid_before = 1
  if (invalid === 'empty') h.action.calls = []
  if (invalid === 'native-value') h.action.calls[0].amount_in_base_units = '1'
  if (invalid === 'calldata') h.action.calls[0].call_data = '0x1'
  await assert.rejects(h.executeWalletBatch(h.ctx, h.provider, h.action), /invalid or expired/)
  assert.equal(h.batches.batches.swap.state, 'failed', 'invalid preflight permits a fresh explicit attempt')
  assert.equal(h.batches.batches.swap.standardNextAttempt, true)
  assert.equal(isBatchOutstanding(h.batches.batches.swap), false)
})

for (const receipts of [[{ transactionHash: hash, status: 'success' }],
  [{ transactionHash: hash, status: 'success' }, { transactionHash: finalHash, status: 'success' }]]) {
  test(`atomic success selects the last ordered hash from ${receipts.length} receipt(s)`, () => {
    assert.deepEqual(resolveBatchStatus({ statusCode: 200, atomic: true, chainId: 42161, receipts }, 42161),
      { state: 'confirmed', hash: receipts.at(-1).transactionHash })
  })
}
for (const [label, statusCode, atomic, receipts, expected] of [
  ['pending', 100, true, [], 'pending'], ['not submitted', 400, true, [], 'failed'],
  ['fully reverted', 500, true, [{ status: 'reverted', transactionHash: hash }], 'failed'],
  ['partial failure', 600, false, [{ status: 'success', transactionHash: hash }], 'unknown'],
  ['non-atomic success', 200, false, [{ status: 'success', transactionHash: hash }], 'unknown'],
  ['no receipt', 200, true, [], 'unknown'], ['missing reversion receipt', 500, true, [], 'unknown'],
  ['batch ID as hash', 200, true, [{ status: 'success', transactionHash: 'batch-id' }], 'unknown'],
]) test(`status ${label} resolves safely`, () => {
  assert.deepEqual(resolveBatchStatus({ statusCode, atomic, chainId: 42161, receipts }, 42161), { state: expected })
})

test('reload hydrates unresolved batches, retaining wallet identity and preventing retry', () => {
  const saved = new Map()
  const localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) }
  const first = load('../src/stores/walletBatchStore.ts', {}, { localStorage })
  first.useWalletBatchStore.getState().setBatch('swap', { id: 'batch-id', account: address, walletId: 'wallet', providerName: 'EVM', chainId: 42161, networkName: network.name, state: 'pending', timestamp: 1 })
  const restored = load('../src/stores/walletBatchStore.ts', {}, { localStorage })
  const batch = restored.useWalletBatchStore.getState().batches.swap
  assert.equal(batch.id, 'batch-id')
  assert.equal(batch.account, address)
  assert.equal(restored.isBatchOutstanding(batch), true)
})

test('status polling resumes the original wallet, catches up only the real hash, and stops', async () => {
  const h = harness()
  await h.executeWalletBatch(h.ctx, h.provider, h.action)
  let effect, cleanup, statusContext
  const catchups = [], timers = []
  const imports = { ...h.imports, react: { useEffect: callback => { effect = callback } },
    '@/lib/apiClients/layerSwapApiClient': { __esModule: true, default: class { async SwapCatchup(...args) { catchups.push(args) } }, BackendTransactionStatus: { Pending: 'pending' } },
    '@/lib/resolvers/resolverService': { resolverService: { getTransferResolver: () => ({ getAtomicBatchProvider: () => ({ getCallsStatus: async ctx => {
      statusContext = ctx
      return { statusCode: 200, atomic: true, chainId: 42161, receipts: [{ transactionHash: finalHash, status: 'success' }] }
    } }) }) } },
    '@/lib/walletBatch': { resolveBatchStatus }, '@/lib/ErrorHandler': { ErrorHandler: assert.fail },
  }
  const { useWalletBatchPolling } = load('../src/hooks/useWalletBatchPolling.ts', imports,
    { setTimeout: (fn, delay) => { timers.push(delay) }, clearTimeout() {} })
  useWalletBatchPolling('swap', network, [{ ...wallet, address: `0x${'2'.repeat(40)}` }], event => h.lifecycle.push(event))
  cleanup = effect()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(statusContext.selectedWallet.address, address)
  assert.equal(statusContext.id, 'batch-id')
  assert.deepEqual(catchups, [['swap', finalHash]])
  assert.equal(h.tx.swapTransactions.swap.hash, finalHash)
  assert.equal(h.tx.pendingSubmissions.swap, undefined)
  assert.equal(h.batches.batches.swap.state, 'confirmed')
  assert.equal(h.lifecycle.at(-1).transactionHash, finalHash)
  assert.deepEqual(timers, [])
  cleanup()
})

test('status transport errors back off to 30 seconds without releasing submission guards', async () => {
  const h = harness()
  await h.executeWalletBatch(h.ctx, h.provider, h.action)
  let effect, queued, requests = 0
  const delays = []
  const imports = { ...h.imports, react: { useEffect: callback => { effect = callback } },
    '@/lib/apiClients/layerSwapApiClient': { __esModule: true, default: class {}, BackendTransactionStatus: {} },
    '@/lib/resolvers/resolverService': { resolverService: { getTransferResolver: () => ({ getAtomicBatchProvider: () => ({
      getCallsStatus: async () => { if (++requests <= 4) throw new Error('RPC unavailable')
        return { statusCode: 100, atomic: true, chainId: 42161, receipts: [] } },
    }) }) } }, '@/lib/walletBatch': { resolveBatchStatus }, '@/lib/ErrorHandler': { ErrorHandler() {} },
  }
  const { useWalletBatchPolling } = load('../src/hooks/useWalletBatchPolling.ts', imports,
    { setTimeout: (fn, delay) => { queued = fn; delays.push(delay) }, clearTimeout() {} })
  useWalletBatchPolling('swap', network, [wallet], () => {})
  const cleanup = effect()
  await new Promise(resolve => setImmediate(resolve))
  for (let i = 0; i < 4; i++) await queued()
  assert.deepEqual(delays, [4000, 8000, 16000, 30000, 2000])
  assert.equal(h.tx.pendingSubmissions.swap, true)
  assert.equal(isBatchOutstanding(h.batches.batches.swap), true)
  cleanup()
})
