import assert from 'node:assert/strict'
import test from 'node:test'
import { isUserRejection, normalizeWalletErrorCode, walletErrorCode } from '../dist/esm/lib/walletErrors.js'
import { FIXTURES, GENERIC_WRAPPERS } from './wallet-error-fixtures.mjs'

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

// ---- Corpus: every shape below has a provenance tag in wallet-error-fixtures.mjs.

test('provenance-tagged corpus classifies as recorded', () => {
    for (const { label, source, error, expected } of FIXTURES) {
        assert.ok(source, `${label} needs a source`)
        assert.equal(normalizeWalletErrorCode(error), expected, label)
        assert.equal(isUserRejection(error), expected === 'user_rejected', label)
    }
})

test('a generic wrapper never changes the classification of what it wraps', () => {
    for (const { label, error, expected } of FIXTURES) {
        if (expected === 'unknown_error') continue
        for (const [i, wrap] of GENERIC_WRAPPERS.entries()) {
            assert.equal(normalizeWalletErrorCode(wrap(error)), expected, `${label} in wrapper #${i}`)
            for (const [j, wrapAgain] of GENERIC_WRAPPERS.entries()) {
                assert.equal(normalizeWalletErrorCode(wrapAgain(wrap(error))), expected, `${label} in wrappers #${i} then #${j}`)
            }
        }
    }
})

test('internal_rpc_error is only returned when no definitive or descriptive signal exists anywhere', () => {
    const bucketWrappers = GENERIC_WRAPPERS.filter(wrap => walletErrorCode(wrap({})) === '-32603')
    assert.ok(bucketWrappers.length >= 3)
    for (const { label, error, expected } of FIXTURES) {
        if (expected === 'unknown_error' || expected === 'internal_rpc_error') continue
        for (const wrap of bucketWrappers) {
            assert.notEqual(normalizeWalletErrorCode(wrap(error)), 'internal_rpc_error', `${label} must not fall into the bucket`)
        }
    }
    for (const signalless of [{ code: -1, message: 'Provider failure' }, new Error('something unexpected'), { data: { foo: 'bar' } }]) {
        assert.equal(normalizeWalletErrorCode(signalless), 'unknown_error')
        for (const wrap of bucketWrappers) assert.equal(normalizeWalletErrorCode(wrap(signalless)), 'internal_rpc_error')
    }
    assert.equal(normalizeWalletErrorCode({ code: -32603, message: 'Internal JSON-RPC error.', data: { code: 4001 } }), 'user_rejected')
})

test('tree walk survives throwing data getters, data cycles and deep cause chains', () => {
    const throwing = { code: -32603, get data() { throw new Error('unreadable data') }, cause: { code: 4001 } }
    assert.equal(normalizeWalletErrorCode(throwing), 'user_rejected')
    const cyclic = { code: -32603, data: {} }
    cyclic.data.cause = cyclic
    assert.equal(normalizeWalletErrorCode(cyclic), 'internal_rpc_error')
    const mutual = { code: -32603, data: { message: 'Internal JSON-RPC error.' } }
    mutual.data.originalError = mutual
    assert.equal(normalizeWalletErrorCode(mutual), 'internal_rpc_error')
    let deep = { code: 4001 }
    for (let i = 0; i < 20; i++) deep = { code: -32603, message: 'Internal JSON-RPC error.', cause: deep }
    // Bounded at 16 nodes: the 4001 leaf is out of reach, the walk still terminates.
    assert.equal(normalizeWalletErrorCode(deep), 'internal_rpc_error')
    let reachable = { code: 4001 }
    for (let i = 0; i < 10; i++) reachable = { code: -32603, cause: reachable }
    assert.equal(normalizeWalletErrorCode(reachable), 'user_rejected')
})
