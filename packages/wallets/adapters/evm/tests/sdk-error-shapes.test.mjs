import assert from 'node:assert/strict'
import test from 'node:test'
import { createWalletClient, custom } from 'viem'
import { mainnet } from 'viem/chains'
import { isUserRejection, normalizeWalletErrorCode } from '@layerswap/wallet-core/errors'
import { isEvmUserRejection, resolveError } from '../dist/esm/evmUtils/resolveError.js'

// Round trip through the real viem request pipeline: the provider throws the
// raw wallet/node error, viem wraps it (InternalRpcError, InvalidInputRpcError,
// UserRejectedRequestError, UnknownRpcError, ...) and the adapter classifies the
// wrapped error exactly as the widget receives it.
async function throughViem(providerError) {
    const client = createWalletClient({
        chain: mainnet,
        transport: custom({ request: async () => { throw providerError } }, { retryCount: 0 }),
    })
    try {
        await client.signMessage({ account: '0x0000000000000000000000000000000000000001', message: 'layerswap' })
    } catch (error) {
        return error
    }
    assert.fail('viem should have thrown')
}

// Serialized literals copied from @metamask/rpc-errors@6.4.0
// (node_modules/.pnpm/@metamask+rpc-errors@6.4.0/.../dist/utils.mjs:80-90): a
// non-JSON-RPC error becomes the fallback -32603 with the original under data.cause.
const RPC_ERRORS_FALLBACK = {
    code: -32603,
    message: 'Internal JSON-RPC error.',
    data: { cause: { message: 'User rejected the request.', stack: 'Error: User rejected the request.\n    at <anonymous>' } },
}

const DECLINES = [
    ['-32603 with rejection text', { code: -32603, message: 'User rejected the request.' }],
    ['-32603 with data.code 4001', { code: -32603, message: 'Internal JSON-RPC error.', data: { code: 4001 } }],
    ['-32603 with data.originalError 4001', { code: -32603, message: 'Internal JSON-RPC error.', data: { originalError: { code: 4001, message: 'User rejected the request.' } } }],
    ['rpc-errors serializer fallback', RPC_ERRORS_FALLBACK],
    ['Ledger decline text', { code: -32603, message: 'Ledger: Condition of use not satisfied (denied by the user?)' }],
    ['EIP-1193 4001', { code: 4001, message: 'User rejected the request.' }],
    ['CAIP-25 5000', { code: 5000, message: 'User rejected.' }],
    ['Error without a code', new Error('User rejected the request.')],
    ['legacy user rejection wording', new Error('User has rejected the request.')],
    ['legacy rejection wording relayed as -32000', { code: -32000, message: 'User has rejected the request.' }],
]

test('viem-wrapped wallet declines are rejections for classification, adapter and resolveError', async () => {
    for (const [label, providerError] of DECLINES) {
        const error = await throughViem(providerError)
        assert.equal(normalizeWalletErrorCode(error), 'user_rejected', label)
        assert.equal(isUserRejection(error), true, label)
        assert.equal(isEvmUserRejection(error), true, label)
        assert.equal(resolveError(error), 'transaction_rejected', label)
    }
})

test('a bare -32603 through viem stays an internal RPC error, never a decline', async () => {
    const error = await throughViem({ code: -32603, message: 'Internal JSON-RPC error.' })
    assert.equal(error.name, 'InternalRpcError')
    assert.equal(normalizeWalletErrorCode(error), 'internal_rpc_error')
    assert.equal(isEvmUserRejection(error), false)
    assert.notEqual(resolveError(error), 'transaction_rejected')
})

test('viem InvalidInputRpcError over node -32000 keeps the underlying reason', async () => {
    const cases = [
        ['insufficient funds for gas * price + value', 'insufficient_funds'],
        ['nonce too low', 'nonce_or_replacement'],
        ['execution reverted', 'contract_reverted'],
        ['request timed out', 'timeout'],
        ['invalid sender', 'unknown_error'],
    ]
    for (const [message, expected] of cases) {
        const error = await throughViem({ code: -32000, message })
        assert.equal(error.name, 'InvalidInputRpcError', message)
        assert.equal(normalizeWalletErrorCode(error), expected, message)
        assert.equal(isEvmUserRejection(error), false, message)
        assert.notEqual(resolveError(error), 'transaction_rejected', message)
    }
})

test('viem provider errors keep their EIP-1193 meaning', async () => {
    const unauthorized = await throughViem({ code: 4100, message: 'The requested account has not been authorized.' })
    assert.equal(normalizeWalletErrorCode(unauthorized), 'unauthorized')
    assert.equal(isEvmUserRejection(unauthorized), false)
    const chainNotAdded = await throughViem({ code: 4902, message: 'Unrecognized chain ID.' })
    assert.equal(normalizeWalletErrorCode(chainNotAdded), 'chain_not_added')
    assert.equal(isEvmUserRejection(chainNotAdded), false)
})
