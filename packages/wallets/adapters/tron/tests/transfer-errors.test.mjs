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

test('a TRON wallet decline is a declared rejection', () => {
    const original = new Error('user reject this request')
    const thrown = toTransferError(original)
    expectRejected(thrown, original)
    assert.equal(thrown.message, 'user reject this request')
})

test('TRON bandwidth and unexpected failures keep their labels without a reason code', () => {
    const bandwidth = new Error('BANDWITH_ERROR')
    expectNotRejected(toTransferError(bandwidth), bandwidth, 'InsufficientFunds')
    for (const original of [new Error('Transaction failed'), new Error('Transaction rejected by node'), 'signing unavailable']) {
        const thrown = toTransferError(original)
        expectNotRejected(thrown, original, 'UnexpectedErrorMessage')
        assert.equal(thrown.message, original instanceof Error ? original.message : original)
    }
})
