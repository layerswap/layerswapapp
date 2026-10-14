import assert from 'node:assert/strict'
import test, { after, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

// Keep the transaction builder, policy and gas math real; replace RPC access.
const rpcUrl = `data:text/javascript,${encodeURIComponent(`
    export const state = {}
    export const createPublicClient = () => {
        state.clients++
        return {
            estimateGas: async args => { state.estimate = args; return 22_515n },
            estimateFeesPerGas: async () => state.fees,
        }
    }
    export default network => ({ id: Number(network.chain_id) })
    export const resolveFallbackTransport = () => ({})
`)}`
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    const parent = context.parentURL ?? ''
    if (parent.endsWith('/gasProviders/resolveEVMTransactionGasParameters.js') && [
        'viem', '../evmUtils/resolveChain', '../evmUtils/resolveTransports',
    ].includes(specifier)) return { url: rpcUrl, shortCircuit: true }
    if (specifier.startsWith('.') && !extname(specifier) && parent.includes('/dist/esm/')) {
        return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
} })
const { state } = await import(rpcUrl)
const { transactionBuilder } = await import('../dist/esm/transferProvider/transactionBuilder.js')
const params = {
    amount: 1,
    depositAddress: `0x${'12'.repeat(20)}`,
    selectedWallet: { address: `0x${'34'.repeat(20)}` },
    network: { chain_id: '143', nodes: [] },
    token: { symbol: 'MON', decimals: 18 },
}
beforeEach(() => Object.assign(state, {
    clients: 0, estimate: undefined,
    fees: { maxFeePerGas: 122_000_000_000n, maxPriorityFeePerGas: 2_000_000_000n },
}))
after(() => hooks.deregister())

test('Monad native transfers preserve empty calldata and explicit gas units and fees', async () => {
    const tx = await transactionBuilder({ ...params, callData: '' })
    assert.equal(tx.value, 10n ** 18n)
    assert.equal(tx.data, '0x')
    assert.equal(tx.gas, 24_204n)
    assert.equal(tx.maxFeePerGas, 122_000_000_000n)
    assert.equal(tx.maxPriorityFeePerGas, 2_000_000_000n)
    assert.deepEqual(state.estimate, { account: tx.account, to: tx.to, data: '0x', value: tx.value })
})

test('Monad token transfers retain calldata without attaching native value', async () => {
    const tx = await transactionBuilder({ ...params, token: { ...params.token, contract: `0x${'56'.repeat(20)}` }, callData: '0x1234' })
    assert.equal(tx.value, 0n)
    assert.equal(tx.data, '0x1234')
    assert.equal(state.estimate.value, 0n)
    assert.equal(tx.gas, 24_204n)
})

test('other EVM chains continue to let the wallet set gas parameters', async () => {
    const tx = await transactionBuilder({ ...params, network: { ...params.network, chain_id: '1' } })
    assert.equal(state.clients, 0)
    assert.equal(tx.gas, undefined)
    assert.equal(tx.maxFeePerGas, undefined)
    assert.equal(tx.value, 10n ** 18n)
    assert.equal(tx.data, '0x')
})

test('Monad does not fall back to wallet gas parameters when EIP-1559 fees are unavailable', async () => {
    state.fees = {}
    await assert.rejects(transactionBuilder(params), /EIP-1559 fee data is unavailable for chain 143/)
})
