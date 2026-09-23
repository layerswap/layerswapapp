import assert from 'node:assert/strict'
import test from 'node:test'
import { ActionMessageType } from '@layerswap/widget-types'
import {
    isUserRejection, isWalletErrorReasonCode, normalizeWalletErrorCode, userRejectedError, walletActionError, walletErrorCode,
} from '../dist/esm/lib/walletErrors.js'
import { FIXTURES, GENERIC_WRAPPERS } from './wallet-error-fixtures.mjs'

test('rejection classification works without an SDK or a particular message', () => {
    for (const error of [
        { code: 4001 }, { code: '4001' }, { code: 'ACTION_REJECTED', message: 'Request declined' },
        userRejectedError({ message: 'Cancelled' }),
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
        // Legacy EVM cancellation shapes are recognised by that adapter, which
        // then throws userRejectedError; the shared classifier never guesses from -1.
        { cause: { code: -1 } }, { data: { code: -1 } },
        new Error('RPC endpoint unavailable'),
    ]) assert.equal(isUserRejection(error), false)
    assert.equal(normalizeWalletErrorCode({ code: 4100 }), 'unauthorized')
})

test('the rejected UI label never classifies on its own', () => {
    for (const error of [
        { name: 'TransactionRejected', message: 'Execute failed' },
        { name: 'TransactionRejected', message: 'Transaction rejected by sequencer' },
        Object.assign(new Error('The Stellar transaction was rejected', { cause: new Error('WebSocket connection closed') }), { name: 'TransactionRejected' }),
        { name: 'TransactionRejected', cause: { name: 'HttpRequestError' } },
        { type: 'SwapWithdrawalError', name: 'TransactionRejected', message: 'Execute failed' },
    ]) {
        assert.equal(isUserRejection(error), false)
        assert.notEqual(normalizeWalletErrorCode(error), 'user_rejected')
    }
    for (const name of Object.values(ActionMessageType)) {
        assert.equal(isUserRejection({ name, message: 'x' }), false, name)
    }
})

test('an explicit adapter reasonCode wins over every inferred signal, anywhere in the chain', () => {
    assert.equal(normalizeWalletErrorCode(walletActionError(ActionMessageType.TransactionRejected, { message: 'Execute failed', reasonCode: 'contract_reverted' })), 'contract_reverted')
    assert.equal(normalizeWalletErrorCode(walletActionError(ActionMessageType.TransactionRejected, { message: 'Execute failed' })), 'unknown_error')
    assert.equal(normalizeWalletErrorCode(userRejectedError({ cause: { code: -1 } })), 'user_rejected')
    assert.equal(normalizeWalletErrorCode(new Error('wrapper', { cause: userRejectedError() })), 'user_rejected')
    assert.equal(normalizeWalletErrorCode({ type: 'SwapWithdrawalError', message: 'declined', cause: userRejectedError() }), 'user_rejected')
    // The outer adapter decision beats an inner declaration.
    assert.equal(normalizeWalletErrorCode(walletActionError(ActionMessageType.UnexpectedErrorMessage, { message: 'x', reasonCode: 'network_error', cause: userRejectedError() })), 'network_error')
    // Unknown strings keep the taxonomy bounded and fall through to inference.
    assert.equal(normalizeWalletErrorCode({ reasonCode: 'made_up', code: 4001 }), 'user_rejected')
    assert.equal(isWalletErrorReasonCode('made_up'), false)
    assert.equal(isWalletErrorReasonCode('user_rejected'), true)
    assert.equal(isWalletErrorReasonCode('__proto__'), false)

    const err = new Error('inner')
    const rejected = userRejectedError({ cause: err })
    assert.equal(rejected.cause, err)
    assert.equal(rejected.name, 'TransactionRejected')
    assert.equal(rejected.reasonCode, 'user_rejected')
    assert.equal(typeof userRejectedError().message, 'string')
    assert.equal(userRejectedError().message, 'Transaction rejected')
    assert.ok(Object.prototype.propertyIsEnumerable.call(rejected, 'reasonCode'), 'serialisable for hosts')
    assert.equal(isUserRejection(JSON.parse(JSON.stringify({ ...rejected, message: rejected.message }))), true)
    const labelled = walletActionError(ActionMessageType.InsufficientFunds, { message: 'BANDWITH_ERROR', cause: 'BANDWITH_ERROR' })
    assert.equal(labelled.name, 'InsufficientFunds')
    assert.equal(labelled.cause, 'BANDWITH_ERROR')
    assert.equal('reasonCode' in labelled, false)
    assert.equal(walletActionError(ActionMessageType.TransactionFailed, { message: 'x' }).cause, undefined)
})

test('chain adapter decline phrases classify without the sentinel; near-misses do not', () => {
    for (const message of [
        'An error occurred (USER_REFUSED_OP)',
        '[TON_CONNECT_SDK_ERROR] Reject request',
        'user reject this request',
        'User canceled sending transaction',
        'User rejected the transaction!',
        'User rejected the request.',
    ]) {
        assert.equal(normalizeWalletErrorCode(new Error(message)), 'user_rejected', message)
        assert.equal(normalizeWalletErrorCode(message), 'user_rejected', message)
    }
    for (const message of [
        'Transaction rejected by node',
        'Session closed',
        'Execute failed',
        'Request cancelled without user response!',
        'op_underfunded',
        'Horizon rejected the Stellar transaction',
    ]) {
        assert.equal(isUserRejection(new Error(message)), false, message)
        assert.equal(isUserRejection(message), false, message)
    }
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
