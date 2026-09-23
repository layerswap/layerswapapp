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

test('a TON Connect decline string is a declared rejection with the string as cause', () => {
    const original = '[TON_CONNECT_SDK_ERROR] Reject request'
    const thrown = toTransferError(original)
    expectRejected(thrown, original)
    assert.equal(thrown.message, original)
})

test('TON failures keep their labels without a reason code', () => {
    const notSent = '[TON_CONNECT_SDK_ERROR] Transaction was not sent'
    expectNotRejected(toTransferError(notSent), notSent, 'TransactionFailed')
    for (const original of [new Error('No transaction BOC returned'), new Error('Bridge connection closed'), 'bridge unavailable']) {
        const thrown = toTransferError(original)
        expectNotRejected(thrown, original, 'UnexpectedErrorMessage')
        assert.equal(thrown.message, original instanceof Error ? original.message : original)
    }
})
