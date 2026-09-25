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

test('a Bitcoin wallet decline is a declared rejection, whether thrown as Error or string', () => {
    for (const original of [new Error('User rejected the request.'), 'User rejected the request.']) {
        const thrown = toTransferError(original)
        expectRejected(thrown, original)
        assert.equal(thrown.message, 'User rejected the request.')
    }
})

test('Bitcoin funds and unexpected failures keep their labels without a reason code', () => {
    for (const original of [new Error('Insufficient balance.'), 'Insufficient funds for fee']) {
        expectNotRejected(toTransferError(original), original, 'InsufficientFunds')
    }
    for (const original of [new Error('Broadcast failed'), new Error('Connection closed'), { message: 'rpc failure' }]) {
        const thrown = toTransferError(original)
        expectNotRejected(thrown, original, 'UnexpectedErrorMessage')
        assert.equal(thrown.message, original.message)
    }
})
