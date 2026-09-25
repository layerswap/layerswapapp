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

test('Fuel wallet declines (including a prompt closed without an answer) are declared rejections', () => {
    for (const message of ['Request cancelled without user response!', 'User rejected the transaction!', 'User canceled sending transaction']) {
        const original = new Error(message)
        const thrown = toTransferError(original)
        expectRejected(thrown, original)
        assert.equal(thrown.message, message)
    }
})

test('Fuel funds and unexpected failures keep their labels without a reason code', () => {
    for (const message of [
        "The account(s) sending the transaction don't have enough funds to cover the transaction.",
        'the target cannot be met due to no coins available or exceeding the 255 coin limit.',
    ]) {
        const original = new Error(message)
        expectNotRejected(toTransferError(original), original, 'InsufficientFunds')
    }
    for (const original of [new Error('No transaction ID returned'), new Error('Session closed'), 'Fuel wallet not found']) {
        const thrown = toTransferError(original)
        expectNotRejected(thrown, original, 'UnexpectedErrorMessage')
        assert.equal(thrown.message, original instanceof Error ? original.message : original)
    }
})
