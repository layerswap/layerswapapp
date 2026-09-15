import assert from 'node:assert/strict'
import test from 'node:test'
import { isUserRejection, normalizeWalletErrorCode } from '../dist/esm/lib/walletErrors.js'

test('rejection classification works without an SDK or a particular message', () => {
    for (const error of [
        { code: 4001 }, { code: '4001' }, { code: 'ACTION_REJECTED', message: 'Request declined' },
        { name: 'TransactionRejected', message: 'Cancelled' },
        { name: 'UserRejectedRequestError' },
        new Error('user rejected transaction'),
        new Error('wrapper', { cause: { code: 'ACTION_REJECTED' } }),
        { code: -32603, cause: { code: 4001 } },
    ]) {
        assert.equal(normalizeWalletErrorCode(error), 'user_rejected')
        assert.equal(isUserRejection(error), true)
    }
})

test('authorization and node failures must not become user cancellations', () => {
    for (const error of [
        { code: 4100 }, { name: 'UnauthorizedProviderError' },
        { code: -32003, name: 'TransactionRejectedRpcError', message: 'Transaction rejected' },
        { code: -1, message: 'Provider failure' },
        // Legacy EVM cancellation shapes are handled by that adapter before
        // it emits the shared TransactionRejected sentinel.
        { cause: { code: -1 } }, { data: { code: -1 } },
        new Error('RPC endpoint unavailable'),
    ]) assert.equal(isUserRejection(error), false)
    assert.equal(normalizeWalletErrorCode({ code: 4100 }), 'unauthorized')
})

test('explicit cancellation codes win over generic errors anywhere in the cause chain', () => {
    for (const code of [4001, '4001', 'ACTION_REJECTED', 'action_rejected']) {
        for (const error of [
            { code, cause: { code: -32603 } },
            { code: -32603, cause: { code, cause: { code: 'SERVER_ERROR' } } },
        ]) {
            assert.equal(normalizeWalletErrorCode(error), 'user_rejected')
            assert.equal(isUserRejection(error), true)
        }
    }
    assert.equal(normalizeWalletErrorCode({ code: -32603, cause: { code: 'INSUFFICIENT_FUNDS' } }), 'insufficient_funds')
})

test('classification handles cyclic causes and a throwing cause accessor', () => {
    const cycle = { code: 'ACTION_REJECTED' }
    cycle.cause = cycle
    assert.equal(isUserRejection(cycle), true)
    const error = { code: 4001, get cause() { throw new Error('unreadable cause') } }
    assert.equal(isUserRejection(error), true)
    assert.equal(normalizeWalletErrorCode(null), 'unknown_error')
})
