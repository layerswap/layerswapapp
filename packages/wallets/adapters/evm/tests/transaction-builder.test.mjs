import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

const rpcUrl = `data:text/javascript,${encodeURIComponent(`
    export * from ${JSON.stringify(import.meta.resolve('viem'))}
    export default () => ({})
    export const resolveFallbackTransport = () => ({})
    export const createPublicClient = () => { throw new Error('Unexpected fee RPC') }
`)}`
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    const parent = context.parentURL ?? ''
    if (parent.endsWith('/gasProviders/resolveEVMTransactionGasParameters.js') && ['viem', '../evmUtils/resolveChain', '../evmUtils/resolveTransports'].includes(specifier)) {
        return { url: rpcUrl, shortCircuit: true }
    }
    if (parent.endsWith('/gasProviders/resolveEVMFeeData.js') && specifier === '../NetworkSettings')
        return { url: 'data:text/javascript,export default class { static KnownSettings = {} }', shortCircuit: true }
    if (specifier.startsWith('.') && !extname(specifier) && parent.includes('/dist/esm/'))
        return nextResolve(`${specifier}.js`, context)
    return nextResolve(specifier, context)
} })
after(() => hooks.deregister())
const { transactionBuilder } = await import('../dist/esm/transferProvider/transactionBuilder.js')

test('preparing an ordinary EVM transaction never waits for fee estimation or uses token fees as gas units', async () => {
    const tx = await transactionBuilder({
        amount: '0.01', callData: '0x1234', depositAddress: '0x0000000000000000000000000000000000000002',
        selectedWallet: { address: '0x0000000000000000000000000000000000000001' }, network: { chain_id: '10' }, token: { decimals: 18 },
    })
    assert.equal(tx.gas, undefined)
    assert.equal(tx.value, 10000000000000000n)
    assert.equal(tx.chainId, 10)
    assert.equal(tx.data, '0x1234')
    assert.equal(tx.account, '0x0000000000000000000000000000000000000001')
    assert.equal(tx.to, '0x0000000000000000000000000000000000000002')
})
