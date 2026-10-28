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
import { toTransferError } from '../src/transferProvider/toTransferError.ts'

test('a Solana wallet decline is a declared rejection', () => {
    const original = new Error('User rejected the request.')
    const thrown = toTransferError(original)
    expectRejected(thrown, original)
    assert.equal(thrown.message, 'User rejected the request.')
})

test('Solana pre-flight balance and unexpected failures keep their labels without a reason code', () => {
    const funds = Object.assign(new Error('Insufficient balance for: SOL'), { name: 'InsufficientFunds' })
    const mapped = toTransferError(funds)
    expectNotRejected(mapped, funds, 'InsufficientFunds')
    assert.equal(mapped.message, 'Insufficient balance for: SOL')
    for (const original of [new Error('No transaction signature returned'), new Error('Transaction rejected by node'), 'signer unavailable']) {
        const thrown = toTransferError(original)
        expectNotRejected(thrown, original, 'UnexpectedErrorMessage')
        assert.equal(thrown.message, original instanceof Error ? original.message : original)
    }
})

test('a plain-object Solana failure keeps its real message', () => {
    const original = { code: -32603, message: 'Wallet bridge failure' }
    const thrown = toTransferError(original)
    expectNotRejected(thrown, original, 'UnexpectedErrorMessage')
    assert.equal(thrown.message, 'Wallet bridge failure')
})
