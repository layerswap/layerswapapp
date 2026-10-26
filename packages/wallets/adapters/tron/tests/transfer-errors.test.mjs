import assert from 'node:assert/strict'
import test from 'node:test'
import { isUserRejection, normalizeWalletErrorCode } from '@layerswap/wallet-core/errors'

function expectShape(thrown, original, name) {
    assert.equal(thrown.name, name)
    assert.equal(thrown.cause, original)
    assert.equal(typeof thrown.message, 'string')
}
function expectRejected(thrown, original) {
    expectShape(thrown, original, 'TransactionRejected')
    assert.equal(thrown.reasonCode, 'user_rejected')
    assert.equal(normalizeWalletErrorCode(thrown), 'user_rejected')
    assert.equal(isUserRejection(thrown), true)
}
function expectNotRejected(thrown, original, name) {
    expectShape(thrown, original, name)
    assert.equal(thrown.reasonCode, undefined)
    assert.equal(isUserRejection(thrown), false)
}
import { toTransferError } from '../dist/esm/transferProvider/toTransferError.js'
import { TronBroadcastError } from '../dist/esm/transferProvider/tronBroadcast.js'

test('a TRON wallet decline is a declared rejection', () => {
    const original = new Error('user reject this request')
    const thrown = toTransferError(original)
    expectRejected(thrown, original)
    assert.equal(thrown.message, 'user reject this request')
})

test('TRON bandwidth and unexpected failures keep their labels without a reason code', () => {
    const bandwidth = new Error('BANDWITH_ERROR')
    expectNotRejected(toTransferError(bandwidth), bandwidth, 'InsufficientFunds')
    const declinedForBandwidth = new TronBroadcastError({ result: false, code: 'BANDWITH_ERROR', message: Buffer.from('bandwidth is not enough').toString('hex') })
    expectNotRejected(toTransferError(declinedForBandwidth), declinedForBandwidth, 'InsufficientFunds')
    assert.equal(toTransferError(declinedForBandwidth).message, 'BANDWITH_ERROR: bandwidth is not enough')
    assert.equal(normalizeWalletErrorCode(toTransferError(declinedForBandwidth)), 'insufficient_funds')
    const declinedForBalance = new TronBroadcastError({ result: false, code: 'CONTRACT_VALIDATE_ERROR', message: Buffer.from('Validate TransferContract error, balance is not sufficient.').toString('hex') })
    expectNotRejected(toTransferError(declinedForBalance), declinedForBalance, 'InsufficientFunds')
    assert.equal(normalizeWalletErrorCode(toTransferError(declinedForBalance)), 'insufficient_funds')
    const declinedForAddress = new TronBroadcastError({ result: false, code: 'CONTRACT_VALIDATE_ERROR', message: Buffer.from('Validate TransferContract error, Invalid toAddress').toString('hex') })
    expectNotRejected(toTransferError(declinedForAddress), declinedForAddress, 'UnexpectedErrorMessage')
    const declined = new TronBroadcastError({ result: false, code: 'SIGERROR', message: Buffer.from('validate signature error').toString('hex') })
    const thrownDecline = toTransferError(declined)
    expectNotRejected(thrownDecline, declined, 'UnexpectedErrorMessage')
    assert.equal(thrownDecline.message, 'SIGERROR: validate signature error')
    assert.equal(thrownDecline.cause.cause.code, 'SIGERROR', 'the node response stays reachable as the cause of the cause')
    for (const original of [new Error('Transaction failed'), new Error('Transaction rejected by node'), 'signing unavailable']) {
        const thrown = toTransferError(original)
        expectNotRejected(thrown, original, 'UnexpectedErrorMessage')
        assert.equal(thrown.message, original instanceof Error ? original.message : original)
    }
})
