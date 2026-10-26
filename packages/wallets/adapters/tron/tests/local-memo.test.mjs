import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Keep the transfer provider real; replace TronWeb, the adapter manager and the gas estimate.
function load(path, imports) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(name => {
        assert.ok(name in imports, `Unexpected dependency: ${name}`)
        return imports[name]
    }, module, module.exports)
    return module.exports
}

test('the deposit memo is added with a locally computed transaction id, without a node round trip', async () => {
    const calls = []
    const { createTronTransfer } = load('../src/transferProvider/createTronTransfer.ts', {
        tronweb: { TronWeb: class {
            fullNode = { request: async (...args) => { calls.push(['fullNode.request', ...args]); throw new Error('RPC unavailable') } }
            transactionBuilder = { addUpdateData: async (transaction, data, format, options) => {
                calls.push(['addUpdateData', data, format, options])
                return { ...transaction, raw_data: { ...transaction.raw_data, data } }
            } }
            trx = { sendRawTransaction: async signed => { calls.push(['sendRawTransaction', signed.txID]); return { result: true } } }
        } },
        './transactionBuilder': { buildInitialTransaction: async () => ({ txID: 'local-id', raw_data: {} }) },
        './toTransferError': { toTransferError: error => error },
        '../tronGasProvider': { TronGasProvider: class { async getGas() { return { gas: 1 } } } },
        '@layerswap/utils': { KnownInternalNames: { Networks: { TronMainnet: 'TRON_MAINNET', TronTestnet: 'TRON_TESTNET' } } },
        '../service/tronAdapterManager': { tronAdapterManager: {
            getActiveAdapter: () => ({}), signTransaction: async transaction => ({ ...transaction, signature: ['sig'] }),
        } },
    })
    const hash = await createTronTransfer().executeTransfer({
        callData: 'swap memo', amount: 1, depositAddress: 'TDeposit', token: { decimals: 6, contract: 'TToken' },
        network: { name: 'TRON_MAINNET', node_url: 'https://tron.example' }, selectedWallet: { address: 'TSource' },
    })
    assert.equal(hash, 'local-id')
    assert.deepEqual(calls, [
        ['addUpdateData', '73776170206d656d6f', 'hex', { txLocal: true }],
        ['sendRawTransaction', 'local-id'],
    ], 'the node is contacted only to broadcast the signed transaction')
})
