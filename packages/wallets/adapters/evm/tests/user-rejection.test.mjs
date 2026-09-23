import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { BaseError, UserRejectedRequestError, UnauthorizedProviderError, TransactionRejectedRpcError } from 'viem'
import { isUserRejection } from '@layerswap/wallet-core/errors'
import { isEvmUserRejection, resolveError } from '../dist/esm/evmUtils/resolveError.js'

// The built package keeps the bundler's extensionless relative imports.
const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
            try { return nextResolve(`${specifier}.js`, context) } catch { return nextResolve(`${specifier}/index.js`, context) }
        }
        return nextResolve(specifier, context)
    },
})
after(() => hooks.deregister())

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

// ---- Thrown transfer errors declare their classification; the rejected label alone never does.

test('EVM transfer errors carry the UI label, a string message, the original cause and an explicit reason', async () => {
    const { toTransferError } = await import('../dist/esm/transferProvider/toTransferError.js')
    const { createEVMTransferProvider } = await import('../dist/esm/transferProvider/createEVMTransferProvider.js')
    const legacy = { cause: { code: -1 } }
    const provider = createEVMTransferProvider({}, () => true, async () => { throw legacy })
    const thrown = await provider.executeTransfer({ selectedWallet: {} }).then(() => assert.fail('must throw'), error => error)
    assert.equal(thrown.name, 'TransactionRejected')
    assert.equal(thrown.reasonCode, 'user_rejected')
    assert.equal(thrown.cause, legacy)
    assert.equal(typeof thrown.message, 'string')
    assert.equal(isUserRejection(thrown), true)
    assert.equal(isUserRejection(legacy), false, 'the legacy shape is only a decline at the adapter boundary')

    for (const original of [{ code: 4001 }, new BaseError('Signing failed', { cause: new UserRejectedRequestError(new Error('Request declined')) })]) {
        const mapped = toTransferError(original)
        assert.equal(mapped.name, 'TransactionRejected')
        assert.equal(mapped.cause, original)
        assert.equal(isUserRejection(mapped), true)
        assert.equal(typeof mapped.message, 'string')
    }
    const funds = toTransferError({ code: 'INSUFFICIENT_FUNDS', message: 'insufficient funds for gas' })
    assert.equal(funds.name, 'InsufficientFunds')
    assert.equal(isUserRejection(funds), false)
    for (const original of [new TransactionRejectedRpcError(new Error('Transaction rejected by node')), new Error('RPC endpoint unavailable')]) {
        const mapped = toTransferError(original)
        assert.equal(mapped.name, 'UnexpectedErrorMessage')
        assert.equal(mapped.cause, original)
        assert.equal(isUserRejection(mapped), false)
    }
})

test('Hyperliquid and Polymarket declines are declared with the original error as cause', async () => {
    const [{ rejected: hyperliquidRejected }, { rejected: polymarketRejected }] = await Promise.all([
        import('../dist/esm/additionalProviders/hyperliquid/createHyperliquidTransferProvider.js'),
        import('../dist/esm/additionalProviders/polymarket/createPolymarketTransferProvider.js'),
    ])
    for (const rejected of [hyperliquidRejected, polymarketRejected]) {
        const err = new UserRejectedRequestError(new Error('Request declined'))
        const thrown = rejected(err)
        assert.equal(thrown.name, 'TransactionRejected')
        assert.equal(thrown.cause, err)
        assert.equal(isUserRejection(thrown), true)
        assert.equal(typeof thrown.message, 'string')
    }
})
