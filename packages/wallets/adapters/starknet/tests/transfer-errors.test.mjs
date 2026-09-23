import assert from 'node:assert/strict'
import test from 'node:test'
import { isUserRejection, normalizeWalletErrorCode } from '@layerswap/wallet-core/errors'
import { toTransferError } from '../dist/esm/transferProvider/toTransferError.js'

function expectShape(thrown, original, name) {
    assert.equal(thrown.name, name)
    assert.equal(thrown.cause, original)
    assert.equal(typeof thrown.message, 'string')
}

test('a Starknet wallet decline is declared, not inferred from the label', () => {
    const original = new Error('An error occurred (USER_REFUSED_OP)')
    const thrown = toTransferError(original)
    expectShape(thrown, original, 'TransactionRejected')
    assert.equal(thrown.reasonCode, 'user_rejected')
    assert.equal(normalizeWalletErrorCode(thrown), 'user_rejected')
    assert.equal(isUserRejection(thrown), true)
})

test("'Execute failed' keeps the rejected copy but is reported as a failure until its origin is verified", () => {
    const original = new Error('Execute failed')
    const thrown = toTransferError(original)
    expectShape(thrown, original, 'TransactionRejected')
    assert.equal(thrown.reasonCode, undefined)
    assert.notEqual(normalizeWalletErrorCode(thrown), 'user_rejected')
    assert.equal(normalizeWalletErrorCode(thrown), 'unknown_error')
    assert.equal(isUserRejection(thrown), false)
})

test('other Starknet failures keep their labels and a string message', () => {
    const failed = toTransferError('failedTransfer')
    expectShape(failed, 'failedTransfer', 'TransactionFailed')
    assert.equal(failed.message, 'failedTransfer')
    assert.equal(isUserRejection(failed), false)

    const raw = new Error('Transaction rejected by sequencer')
    const unexpected = toTransferError(raw)
    expectShape(unexpected, raw, 'UnexpectedErrorMessage')
    assert.equal(unexpected.message, 'Transaction rejected by sequencer')
    assert.equal(isUserRejection(unexpected), false)

    // The old catch set `message` to the raw Error object; every message is a string now.
    const nested = new Error('No transaction hash returned')
    assert.equal(toTransferError(nested).message, 'No transaction hash returned')
})
