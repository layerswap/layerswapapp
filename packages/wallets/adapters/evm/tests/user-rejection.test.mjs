import assert from 'node:assert/strict'
import test from 'node:test'
import { BaseError, UserRejectedRequestError, UnauthorizedProviderError, TransactionRejectedRpcError } from 'viem'
import { isUserRejection } from '@layerswap/wallet-core/errors'
import { isEvmUserRejection, resolveError } from '../dist/esm/evmUtils/resolveError.js'

test('EVM signing preserves legacy nested cancellation codes without broadening shared classification', () => {
    for (const error of [
        { cause: { code: -1 } },
        { data: { code: -1 } },
        { code: -32603, cause: { code: -1 } },
        { cause: { cause: { cause: { code: -1 } } } },
    ]) {
        assert.equal(isUserRejection(error), false)
        assert.equal(isEvmUserRejection(error), true)
        assert.equal(resolveError(error), 'transaction_rejected')
    }
})

test('EVM signing and transfers share structured and SDK rejection handling', () => {
    for (const error of [
        { code: 4001 }, { code: '4001' },
        { code: 4001, cause: { code: -32603 } },
        { code: 'ACTION_REJECTED', message: 'Request declined' },
        new BaseError('Signing failed', { cause: new UserRejectedRequestError(new Error('Request declined')) }),
    ]) {
        assert.equal(isEvmUserRejection(error), true)
        assert.equal(resolveError(error), 'transaction_rejected')
    }
})

test('EVM compatibility keeps generic failures visible and preserves funds classification', () => {
    for (const error of [
        { code: -1, message: 'Provider failure' },
        new UnauthorizedProviderError(new Error('Account unavailable')),
        new TransactionRejectedRpcError(new Error('Transaction rejected by node')),
        new Error('RPC endpoint unavailable'),
    ]) {
        assert.equal(isEvmUserRejection(error), false)
        assert.notEqual(resolveError(error), 'transaction_rejected')
    }
    assert.equal(resolveError({ code: 'INSUFFICIENT_FUNDS' }), 'insufficient_funds')
    assert.equal(resolveError({ cause: { code: -32000 } }), 'insufficient_funds')
})
