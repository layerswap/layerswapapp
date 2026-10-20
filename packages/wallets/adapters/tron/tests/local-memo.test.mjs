import assert from 'node:assert/strict'
import test from 'node:test'
import { TronWeb, utils } from 'tronweb'

for (const type of ['TransferContract', 'TriggerSmartContract']) test(`local memo construction requires no getsignweight: ${type}`, async () => {
    const tron = new TronWeb({ fullHost: 'https://node.example' })
    tron.fullNode.request = async () => assert.fail('memo reconstruction must not call RPC')
    const owner = '41' + '11'.repeat(20)
    const value = type === 'TransferContract'
        ? { owner_address: owner, to_address: '41' + '22'.repeat(20), amount: 35 }
        : { owner_address: owner, contract_address: '41' + '22'.repeat(20), data: 'a9059cbb' + '00'.repeat(64) }
    const original = {
        visible: false,
        raw_data: {
            contract: [{ type, parameter: { value, type_url: `type.googleapis.com/protocol.${type}` } }],
            ref_block_bytes: '1234', ref_block_hash: '11'.repeat(8),
            expiration: 1800000060000, timestamp: 1800000000000,
            ...(type === 'TriggerSmartContract' ? { fee_limit: 100000000 } : {}),
        },
    }
    const transaction = await tron.transactionBuilder.addUpdateData(original, '73776170206d656d6f', 'hex', { txLocal: true })
    assert.equal(transaction.raw_data.data, '73776170206d656d6f')
    assert.equal(transaction.raw_data.ref_block_hash, original.raw_data.ref_block_hash)
    assert.equal(transaction.raw_data.expiration, original.raw_data.expiration)
    assert.deepEqual(transaction.raw_data.contract, original.raw_data.contract)
    const pb = utils.transaction.txJsonToPb(transaction)
    assert.equal(transaction.txID, utils.transaction.txPbToTxID(pb).replace(/^0x/, ''))
    assert.equal(transaction.raw_data_hex, utils.transaction.txPbToRawDataHex(pb).toLowerCase())
})
