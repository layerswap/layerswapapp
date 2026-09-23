import assert from 'node:assert/strict'
import test from 'node:test'
import { isUserRejection, normalizeWalletErrorCode } from '@layerswap/wallet-core/errors'
import { toTransferError } from '../dist/esm/transferProvider/toTransferError.js'

function expectShape(thrown, original, name) {
    assert.equal(thrown.name, name)
    assert.equal(thrown.cause, original)
    assert.equal(typeof thrown.message, 'string')
}

test('structured declines from the backing EVM or Starknet wallet are declared as rejections', () => {
    for (const original of [
        { code: 4001 },
        Object.assign(new Error('User rejected the request.'), { code: 4001 }),
        new Error('An error occurred (USER_REFUSED_OP)'),
    ]) {
        const thrown = toTransferError(original)
        expectShape(thrown, original, 'TransactionRejected')
        assert.equal(thrown.reasonCode, 'user_rejected')
        assert.equal(normalizeWalletErrorCode(thrown), 'user_rejected')
        assert.equal(isUserRejection(thrown), true)
    }
})

test("a message merely containing 'reject' is a failure, not a decline", () => {
    for (const original of [
        new Error('Transaction rejected by sequencer'),
        new Error('Gateway rejected the transaction: invalid nonce'),
        new Error('Paradex account not found'),
        'EVM wallet not connected',
    ]) {
        const thrown = toTransferError(original)
        expectShape(thrown, original, 'UnexpectedErrorMessage')
        assert.equal(thrown.reasonCode, undefined)
        assert.equal(isUserRejection(thrown), false)
    }
    assert.equal(toTransferError('EVM wallet not connected').message, 'EVM wallet not connected')
})
