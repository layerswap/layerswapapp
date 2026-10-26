import assert from 'node:assert/strict'
import test from 'node:test'
import { loadSource } from './loadSource.mjs'

// Keep the transfer provider and its broadcast handling real; replace TronWeb and the wallet.
const load = (path, imports) => loadSource(new URL(path, import.meta.url), imports)
const tronBroadcast = load('../src/transferProvider/tronBroadcast.ts', {})
const { TronBroadcastError, broadcastMessage, hexToText, textToHex } = tronBroadcast

function transferWith(broadcast) {
    const { createTronTransfer } = load('../src/transferProvider/createTronTransfer.ts', {
        tronweb: { TronWeb: class {
            transactionBuilder = { addUpdateData: async transaction => transaction }
            trx = { sendRawTransaction: broadcast }
        } },
        './transactionBuilder': { buildInitialTransaction: async () => ({ txID: 'signed-id', raw_data: {} }) },
        './toTransferError': { toTransferError: error => error },
        './tronBroadcast.js': tronBroadcast,
        '../tronGasProvider': { TronGasProvider: class { async getGas() { return { gas: 1 } } } },
        '@layerswap/utils': { KnownInternalNames: { Networks: { TronMainnet: 'TRON_MAINNET', TronTestnet: 'TRON_TESTNET' } } },
        '../service/tronAdapterManager': { tronAdapterManager: {
            getActiveAdapter: () => ({}), signTransaction: async transaction => ({ ...transaction, signature: ['sig'] }),
        } },
    })
    return createTronTransfer().executeTransfer({
        callData: 'memo', amount: 1, depositAddress: 'TDeposit', token: { decimals: 6 },
        network: { name: 'TRON_MAINNET', node_url: 'https://tron.example' }, selectedWallet: { address: 'TSource' },
    })
}

const hex = text => Buffer.from(text).toString('hex')

test('a declined broadcast keeps the node code, its decoded reason and the response as the cause', async () => {
    const response = { result: false, code: 'CONTRACT_VALIDATE_ERROR', message: hex('Validate TransferContract error, balance is not sufficient.'), txid: 'signed-id' }
    await assert.rejects(transferWith(async () => response), error => {
        assert.ok(error instanceof TronBroadcastError)
        assert.equal(error.code, 'CONTRACT_VALIDATE_ERROR')
        assert.equal(error.message, 'CONTRACT_VALIDATE_ERROR: Validate TransferContract error, balance is not sufficient.')
        assert.equal(error.cause, response)
        return true
    })
})

test('a duplicate broadcast is the signed transaction already submitted under its id', async () => {
    assert.equal(await transferWith(async () => ({ result: false, code: 'DUP_TRANSACTION_ERROR', message: hex('Transaction already exists'), txid: 'signed-id' })), 'signed-id')
    assert.equal(await transferWith(async () => ({ result: false, code: 'DUP_TRANSACTION_ERROR', message: hex('Transaction already exists') })), 'signed-id')
    assert.equal(await transferWith(async () => ({ result: true })), 'signed-id')
})

test('a duplicate verdict for another transaction id is a failure, not this deposit', async () => {
    const response = { result: false, code: 'DUP_TRANSACTION_ERROR', message: hex('Transaction already exists'), txid: 'other-id' }
    await assert.rejects(transferWith(async () => response), error => error instanceof TronBroadcastError && error.code === 'DUP_TRANSACTION_ERROR' && error.cause === response)
})

test('the memo travels as hex-encoded UTF-8 without Buffer', async () => {
    let broadcast
    await transferWith(async signed => { broadcast = signed; return { result: true } })
    assert.equal(textToHex('memo'), Buffer.from('memo').toString('hex'))
    assert.equal(textToHex('mémo ✓'), Buffer.from('mémo ✓').toString('hex'))
    assert.equal(hexToText(textToHex('mémo ✓')), 'mémo ✓')
    assert.ok(broadcast)
})

test('a broadcast without a code or message is still a failure that keeps the response', async () => {
    for (const response of [{ result: false }, { result: false, code: '', message: '' }]) {
        await assert.rejects(transferWith(async () => response), error => error instanceof TronBroadcastError && error.message === 'BROADCAST_FAILED' && error.cause === response)
    }
})

test('broadcast reasons are decoded from hex and kept as text otherwise', () => {
    assert.equal(broadcastMessage({ message: hex('server busy') }), 'server busy')
    assert.equal(broadcastMessage({ message: `0x${hex('server busy')}` }), 'server busy')
    assert.equal(broadcastMessage({ message: 'Transaction expired' }), 'Transaction expired')
    assert.equal(broadcastMessage({ message: 'deadbeef' }), 'deadbeef', 'hex-looking text that is not UTF-8 stays as it is')
    assert.equal(broadcastMessage({ message: '' }), undefined)
    assert.equal(broadcastMessage({}), undefined)
})
