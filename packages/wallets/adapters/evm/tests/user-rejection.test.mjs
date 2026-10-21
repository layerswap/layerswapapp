import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { BaseError, UserRejectedRequestError, UnauthorizedProviderError, TransactionRejectedRpcError, createWalletClient, custom } from 'viem'
import { optimism } from 'viem/chains'
import { isUserRejection, normalizeWalletErrorCode, walletErrorDetails } from '@layerswap/wallet-core/errors'
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

test('transaction RPC failures wrapped by viem are not reported as user rejection', async () => {
    const { toTransferError } = await import('../dist/esm/transferProvider/toTransferError.js')
    for (const [code, message, reason] of [
        [-32080, 'RPC 0xa Custom eth_getBlockByNumber: RPC endpoint returned HTTP client error.', 'network_error'],
        [-32080, 'RPC 0xa Custom eth_getBlockByNumber: RPC endpoint returned HTTP server error.', 'network_error'],
        // MetaMask Mobile relays its RPC failure over WalletConnect as CAIP-25 5000.
        [5000, 'RPC 0xa Custom eth_getBlockByNumber: RPC endpoint returned HTTP client error.', 'network_error'],
        [5000, 'MetaMask Tx Signature: [REDACTED]', 'user_rejected'],
        [-1, 'Provider failure', 'unknown_error'],
        [4001, 'User rejected the request.', 'user_rejected'],
        [-1, 'User rejected the request.', 'user_rejected'],
    ]) {
        const calls = []
        const client = createWalletClient({
            chain: optimism,
            transport: custom({ request: async ({ method }) => {
                calls.push(method)
                if (method === 'eth_chainId') return '0xa'
                throw Object.assign(new Error(message), { code })
            } }, { retryCount: 0 }),
        })
        const original = await client.sendTransaction({
            account: '0x0000000000000000000000000000000000000001',
            to: '0x0000000000000000000000000000000000000002',
            value: 6640000000000n,
        }).then(() => assert.fail('must throw'), error => error)
        assert.equal(original.name, 'TransactionExecutionError')
        assert.deepEqual(calls, ['eth_chainId', 'eth_sendTransaction'])
        const mapped = toTransferError(original)
        assert.equal(mapped.cause, original)
        assert.equal(mapped.name, reason === 'user_rejected' ? 'TransactionRejected' : 'UnexpectedErrorMessage')
        assert.equal(normalizeWalletErrorCode(mapped), reason)
        assert.equal(isEvmUserRejection(original), reason === 'user_rejected')
        assert.ok(walletErrorDetails(mapped).message.includes(message))
        if (code === -32080) assert.equal(walletErrorDetails(mapped).code, '-32080')
    }
})

test('EVM signing does not infer cancellation from nested unknown-error codes', () => {
    for (const error of [
        { cause: { code: -1 } },
        { data: { code: -1 } },
        { code: -32603, cause: { code: -1 } },
        { cause: { cause: { cause: { code: -1 } } } },
    ]) {
        assert.equal(isUserRejection(error), false)
        assert.equal(isEvmUserRejection(error), false)
        assert.notEqual(resolveError(error), 'transaction_rejected')
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

test('a decline relayed with a nested -32000 is a rejection, not insufficient funds', () => {
    // WalletConnect wallets can answer a declined prompt with -32000; viem nests it under cause.
    for (const error of [
        { cause: { code: -32000, message: 'User rejected the request.' } },
        { data: { code: -32000 }, cause: { code: 4001 } },
    ]) {
        assert.equal(resolveError(error), 'transaction_rejected')
        assert.equal(isEvmUserRejection(error), true)
    }
    // A node -32000 without decline evidence keeps the funds classification.
    assert.equal(resolveError({ cause: { code: -32000, message: 'insufficient funds for gas * price + value' } }), 'insufficient_funds')
    assert.equal(resolveError({ cause: { code: -32000, message: 'execution reverted: user rejected' } }), 'insufficient_funds')
})

// ---- Thrown transfer errors declare their classification; the rejected label alone never does.

test('EVM transfer errors carry the UI label, a string message, the original cause and an explicit reason', async () => {
    const { toTransferError } = await import('../dist/esm/transferProvider/toTransferError.js')
    const { createEVMTransferProvider } = await import('../dist/esm/transferProvider/createEVMTransferProvider.js')
    const legacy = { cause: { code: -1, message: 'User rejected the request.' } }
    const selectedWallet = { address: '0x0000000000000000000000000000000000000001', internalId: 'test-wallet' }
    const config = { state: { status: 'connected', connections: new Map([['test', { accounts: [selectedWallet.address], connector: { id: 'test-wallet' } }]]) } }
    const provider = createEVMTransferProvider(config, () => true, async () => { throw legacy })
    const thrown = await provider.executeTransfer({ selectedWallet }).then(() => assert.fail('must throw'), error => error)
    assert.equal(thrown.name, 'TransactionRejected')
    assert.equal(thrown.reasonCode, 'user_rejected')
    assert.equal(thrown.cause, legacy)
    assert.equal(typeof thrown.message, 'string')
    assert.equal(isUserRejection(thrown), true)
    assert.equal(isUserRejection(legacy), true, 'decline text establishes rejection, not the -1 code')

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

test('transfer UI does not label RPC throttling or preflight reverts as insufficient funds', async () => {
    const { toTransferError } = await import('../dist/esm/transferProvider/toTransferError.js')
    for (const original of [
        { code: -32002, message: 'endpoint returned too many errors' },
        { code: 4200, message: 'HTTP 429' },
        { name: 'EstimateGasExecutionError', cause: { code: -32000, message: 'execution reverted' } },
    ]) assert.equal(toTransferError(original).name, 'UnexpectedErrorMessage')
})
