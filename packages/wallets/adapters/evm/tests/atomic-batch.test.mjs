import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createWalletClient, custom } from 'viem'
import { sendCalls } from 'viem/actions'

const account = `0x${'1'.repeat(40)}`
const otherAccount = `0x${'2'.repeat(40)}`
function harness() {
  const connector = { id: 'selected', uid: 'selected-uid', name: 'Selected wallet' }
  const connection = { connector, accounts: [account, otherAccount], chainId: 42161 }
  const config = { state: { current: connector.uid } }
  const state = { selectedAddress: account, wagmiAccount: { address: account, addresses: [account, otherAccount] } }
  const requests = [], clients = [], queries = []
  const behavior = { capability: 'supported', beforeCapability() {}, foreground() {},
    submit: async () => ({ id: 'batch-id' }) }
  const client = { connector }
  const imports = {
    '@wagmi/core': { getConnections: () => [
      { connector: { id: 'wrong', uid: 'wrong-uid', name: 'Other wallet' }, accounts: [account], chainId: 42161 }, connection],
    getConnectorClient: async (_config, params) => { clients.push(params); assert.equal(params.connector, connector); return client } },
    'viem/actions': {
      getCapabilities: async (_client, params) => { queries.push(params); behavior.beforeCapability(); return { atomic: { status: behavior.capability } } },
      sendCalls: async (_client, params) => { requests.push(params); return behavior.submit() },
      getCallsStatus: async (_client, params) => ({ statusCode: 200, atomic: true, chainId: 42161, receipts: [{ transactionHash: params.id, status: 'success' }] }),
    },
    '@layerswap/wallet-core': { foregroundWalletApp: async () => behavior.foreground() },
    './toTransferError': { toTransferError: error => error }, '../service/evmStore': { useEvmStore: { getState: () => state } },
  }
  const { outputText } = ts.transpileModule(readFileSync(new URL('../src/transferProvider/createEvmAtomicBatch.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)(name => { assert.ok(name in imports, name); return imports[name] }, module, module.exports)
  const provider = module.exports.createEvmAtomicBatch(config)
  const context = { network: { chain_id: '42161' }, selectedWallet: { id: connector.name, address: account,
    isActive: true, metadata: { evmConnectorUid: connector.uid } },
  validBefore: Math.floor(Date.now() / 1000) + 300,
  calls: [{ to_address: otherAccount, call_data: '0x1234', amount_in_base_units: '90071992547409930000000' }] }
  return { provider, context, behavior, requests, clients, queries, config, state, connection }
}

for (const status of ['supported', 'ready', 'unsupported']) test(`capability lookup returns ${status} for the selected connector/account/chain`, async () => {
  const h = harness()
  h.behavior.capability = status
  assert.equal(await h.provider.getCapabilities(h.context), status)
  assert.deepEqual(h.queries, [{ account, chainId: 42161 }])
})

test('submission requires atomicity, disables fallback, and preserves base-unit bigint precision', async () => {
  const h = harness()
  assert.deepEqual(await h.provider.sendCalls(h.context), { id: 'batch-id' })
  assert.equal(h.requests.length, 1)
  assert.deepEqual(h.requests[0], { account, forceAtomic: true, experimental_fallback: false, version: '2.0.0',
    calls: [{ to: otherAccount, data: '0x1234', value: 90071992547409930000000n }] })
})

for (const change of ['account', 'chain', 'connector', 'capability', 'foreground-account']) test(`${change} change immediately before submission stops the wallet request`, async () => {
  const h = harness()
  if (change === 'capability') h.behavior.capability = 'ready'
  else if (change === 'foreground-account') h.behavior.foreground = () => { h.state.selectedAddress = otherAccount }
  else h.behavior.beforeCapability = () => {
    if (change === 'account') h.state.selectedAddress = otherAccount
    if (change === 'chain') h.connection.chainId = 1
    if (change === 'connector') h.config.state.current = 'wrong-uid'
  }
  await assert.rejects(h.provider.sendCalls(h.context), error => error.notSubmitted === true)
  assert.equal(h.requests.length, 0)
})

test('a stale connector identity cannot fall through to another connection with the same account', async () => {
  const h = harness()
  h.context.selectedWallet.metadata.evmConnectorUid = 'disconnected-uid'
  await assert.rejects(h.provider.getCapabilities(h.context), /Reconnect/)
  assert.equal(h.clients.length, 0)
})

for (const code of [4001, 5750, undefined]) test(`RPC failure ${code ?? 'timeout'} never retries submission`, async () => {
  const h = harness()
  h.behavior.submit = async () => { throw Object.assign(new Error('RPC failed'), { cause: { code } }) }
  await assert.rejects(h.provider.sendCalls(h.context), error => !!error.notSubmitted === (code !== undefined))
  assert.equal(h.requests.length, 1)
})

test('status lookup can resume the original account even when a different account is active', async () => {
  const h = harness()
  h.state.selectedAddress = otherAccount
  h.context.selectedWallet.isActive = false
  const result = await h.provider.getCallsStatus({ ...h.context, id: 'batch-id' })
  assert.equal(result.atomic, true)
  assert.equal(result.statusCode, 200)
  assert.equal(h.clients[0].account, account)
})

test('Viem sends atomicRequired on the wire and does not retry a transport timeout', async () => {
  const requests = []
  const client = createWalletClient({ account, chain: { id: 42161, name: 'Arbitrum',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [] } } },
  transport: custom({ request: async request => { requests.push(request); throw new Error('Transport timeout') } }) })
  await assert.rejects(sendCalls(client, { account, calls: [{ to: otherAccount, data: '0x1234', value: 0n }],
    forceAtomic: true, experimental_fallback: false, version: '2.0.0' }))
  assert.equal(requests.length, 1)
  assert.equal(requests[0].method, 'wallet_sendCalls')
  assert.equal(requests[0].params[0].atomicRequired, true)
  assert.equal(requests[0].params[0].chainId, '0xa4b1')
})
