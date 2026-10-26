import assert from 'node:assert/strict'
import test from 'node:test'
import { ActionMessageType } from '@layerswap/widget-types'
import {
    errorMessage, isUserRejection, isWalletErrorReasonCode, normalizeWalletErrorCode, userRejectedError, walletActionError, walletErrorCode, walletErrorCodeFromChain, walletErrorDetails,
} from '../dist/esm/lib/walletErrors.js'
import { FIXTURES, GENERIC_WRAPPERS } from './wallet-error-fixtures.mjs'

test('a synthetic SwitchChainError code does not hide the underlying failure', () => {
    const wrap = cause => Object.assign(new Error('An error occurred when attempting to switch chain.', { cause }), {
        name: 'SwitchChainError', code: 4902, shortMessage: 'An error occurred when attempting to switch chain.',
    })
    for (const [cause, reason, code] of [
        [new Error('Timed out waiting for wallet state'), 'timeout', undefined],
        [new Error('Unexpected response'), 'unknown_error', undefined],
        [{ code: -32002, message: 'Request already pending' }, 'request_pending', '-32002'],
        [{ code: 4001, message: 'User rejected the request' }, 'user_rejected', '4001'],
        [{ code: 4902, message: 'Unrecognized chain ID' }, 'chain_not_added', '4902'],
    ]) {
        const error = wrap(cause)
        assert.equal(normalizeWalletErrorCode(error), reason)
        assert.equal(walletErrorDetails(error).code, code)
        assert.ok(walletErrorDetails(error).message.includes(cause.message))
        assert.equal(walletErrorCode(error), undefined)
    }
    assert.equal(walletErrorDetails('x'.repeat(5000)).message.length, 2048)
    const cyclic = wrap(undefined)
    cyclic.cause = cyclic
    assert.equal(normalizeWalletErrorCode(cyclic), 'unknown_error')
})

test('raw diagnostic codes survive codeless adapter/SDK wrappers without replacing existing outer codes', () => {
    for (const code of [163, 4100, 4001, 0]) {
        const original = Object.assign(new Error('Wallet response'), { code })
        for (const wrap of [cause => new Error('Wrapper', { cause }),
            cause => ({ info: { error: cause } }), cause => ({ data: { originalError: cause } })]) {
            const error = wrap(original)
            assert.equal(walletErrorCodeFromChain(error), String(code))
        }
    }
    const error = { code: -32603, data: { originalError: { code: 4100 } } }
    assert.equal(walletErrorCode(error), '-32603')
    assert.equal(walletErrorCodeFromChain(error), '-32603')
    assert.equal(walletErrorCodeFromChain({ code: 4001, cause: { code: -32603 } }), '4001')
    assert.equal(normalizeWalletErrorCode(error), 'unauthorized')
    assert.equal(walletErrorCodeFromChain({ cause: { code: 'x'.repeat(500) } }).length, 128)
    const cyclic = { code: 163 }; cyclic.cause = cyclic
    assert.equal(walletErrorCodeFromChain(cyclic), '163')
    assert.equal(walletErrorCodeFromChain({ get code() { throw Error('unreadable') }, cause: { code: 163 } }), '163')
    let deep = { code: 163 }
    for (let i = 0; i < 20; i++) deep = { cause: deep }
    assert.equal(walletErrorCodeFromChain(deep), undefined)
    for (const value of [undefined, null, 'Execute failed', { code: NaN }]) assert.equal(walletErrorCodeFromChain(value), undefined)
})

test('classification accepts public code and nesting shapes without an SDK', () => {
    for (const [error, expected] of [
        [{ code: '4001' }, 'user_rejected'],
        [{ code: 'ACTION_REJECTED' }, 'user_rejected'],
        [{ name: 'UserRejectedRequestError' }, 'user_rejected'],
        [{ info: { error: { code: '4001' } } }, 'user_rejected'],
        [{ cause: { info: { data: { originalError: { code: 4001 } } } } }, 'user_rejected'],
        [{ name: 'UnauthorizedProviderError' }, 'unauthorized'],
        [{ cause: { code: -1 } }, 'unknown_error'],
    ]) {
        assert.equal(normalizeWalletErrorCode(error), expected)
        assert.equal(isUserRejection(error), expected === 'user_rejected')
    }
})

test('a prompt the wallet is still showing is request_pending, never a cancellation', () => {
    for (const error of [
        { code: -32002, message: "Request of type 'wallet_switchEthereumChain' already pending for origin https://layerswap.io. Please wait." },
        { code: '-32002' },
        new Error('Already processing eth_requestAccounts. Please wait.'),
        new Error('wrapper', { cause: { code: -32002 } }),
    ]) {
        assert.equal(normalizeWalletErrorCode(error), 'request_pending')
        assert.equal(isUserRejection(error), false)
    }
    assert.equal(isWalletErrorReasonCode('request_pending'), true)
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
    assert.equal(isWalletErrorReasonCode('made_up'), false)
    assert.equal(isWalletErrorReasonCode('user_rejected'), true)
    assert.equal(isWalletErrorReasonCode('__proto__'), false)

    const err = new Error('inner')
    const rejected = userRejectedError({ cause: err })
    assert.equal(rejected.cause, err)
    assert.equal(rejected.name, 'TransactionRejected')
    assert.equal(rejected.reasonCode, 'user_rejected')
    assert.equal(userRejectedError().message, 'Transaction rejected')
    assert.ok(Object.prototype.propertyIsEnumerable.call(rejected, 'reasonCode'), 'serialisable for hosts')
    assert.equal(isUserRejection(JSON.parse(JSON.stringify({ ...rejected, message: rejected.message }))), true)
    const labelled = walletActionError(ActionMessageType.InsufficientFunds, { message: 'BANDWITH_ERROR', cause: 'BANDWITH_ERROR' })
    assert.equal(labelled.name, 'InsufficientFunds')
    assert.equal(labelled.cause, 'BANDWITH_ERROR')
    assert.equal('reasonCode' in labelled, false)
    assert.equal(walletActionError(ActionMessageType.TransactionFailed, { message: 'x' }).cause, undefined)
})

test('raw provider strings distinguish wallet declines from transport failures', () => {
    assert.equal(normalizeWalletErrorCode('An error occurred (USER_REFUSED_OP)'), 'user_rejected')
    assert.equal(isUserRejection('Session closed'), false)
    assert.equal(isUserRejection('origin rejected the request'), false)
    assert.equal(isUserRejection(new Error('origin rejected the request')), false)
    assert.equal(isUserRejection('execution reverted: user rejected'), false)
    assert.equal(isUserRejection(new Error('execution reverted: user rejected')), false)
})

test('lowercase cancellation codes and nested funds errors retain their meaning', () => {
    assert.equal(normalizeWalletErrorCode({ code: -32603, cause: { code: 'action_rejected' } }), 'user_rejected')
    assert.equal(normalizeWalletErrorCode({ code: -32603, cause: { code: 'INSUFFICIENT_FUNDS' } }), 'insufficient_funds')
})

test('ambiguous -32000 RPC codes do not override typed or nested wallet errors', () => {
    const typed = Object.assign(new Error('Transaction failed'), {
        code: -32000,
        name: 'NonceTooLowError',
    })
    assert.equal(normalizeWalletErrorCode(typed), 'nonce_or_replacement')
    const wrapped = Object.assign(new Error('Transaction failed', {
        cause: new Error('execution reverted'),
    }), { code: -32000 })
    assert.equal(normalizeWalletErrorCode(wrapped), 'contract_reverted')
})

test('throttling evidence outranks the codes wallets reuse for it, but never an explicit decline', () => {
    for (const code of [-32002, 4200, -32603, -32000, 'SERVER_ERROR']) {
        assert.equal(normalizeWalletErrorCode({ code, message: 'Too Many Requests' }), 'network_error', `code ${code}`)
        assert.equal(normalizeWalletErrorCode({ code, message: 'Internal error', cause: { status: 429 } }), 'network_error', `status under ${code}`)
    }
    assert.equal(normalizeWalletErrorCode({ code: 4001, message: 'User rejected', cause: { status: 429 } }), 'user_rejected')
    assert.equal(normalizeWalletErrorCode({ code: -32002, message: 'Request of type wallet_requestPermissions already pending' }), 'request_pending')
    assert.equal(normalizeWalletErrorCode({ code: 4200, message: 'Unsupported method' }), 'unsupported_method')
    assert.equal(normalizeWalletErrorCode('HTTP 429: too many requests'), 'network_error')
    assert.equal(normalizeWalletErrorCode({ status: 429 }), 'network_error')
})

test('an endpoint cooldown and a 429 kept on a nested response are throttling, after an explicit decline', () => {
    assert.equal(normalizeWalletErrorCode({ code: 4200, message: 'RPC endpoint returned too many errors, the endpoint is in cooldown.' }), 'network_error')
    assert.equal(normalizeWalletErrorCode({ code: -32002, message: 'RPC is in cooldown' }), 'network_error')
    assert.equal(normalizeWalletErrorCode({ code: 4200, message: 'Unsupported method', response: { status: 429 } }), 'network_error')
    assert.equal(normalizeWalletErrorCode(new Error('request failed', { cause: { response: { status: 429, statusText: 'Too Many Requests' } } })), 'network_error')
    assert.equal(normalizeWalletErrorCode({ code: 4200, message: 'Unsupported method', response: { status: 500 } }), 'unsupported_method')
    assert.equal(normalizeWalletErrorCode({ code: 4001, message: 'User rejected the request', cause: { message: 'RPC is in cooldown' } }), 'user_rejected')
    assert.equal(normalizeWalletErrorCode({ code: -32002, message: 'Request of type wallet_switchEthereumChain already pending. Please wait.' }), 'request_pending')
    assert.equal(normalizeWalletErrorCode({ status: 500, message: 'bad gateway' }), 'unknown_error')
})

test('cooldown wording is transport evidence only on the node carrying a reused code; elsewhere it is descriptive text', () => {
    // A wallet puts an endpoint in cooldown after failures of any kind: the definitive code keeps its meaning.
    assert.equal(normalizeWalletErrorCode({ code: 4902, message: 'Unrecognized chain ID', cause: { message: 'RPC endpoint returned too many errors, the endpoint is in cooldown.' } }), 'chain_not_added')
    assert.equal(normalizeWalletErrorCode({ name: 'InsufficientFundsError', message: 'The total cost exceeds the balance of the account.', cause: { message: 'RPC is in cooldown' } }), 'insufficient_funds')
    assert.equal(normalizeWalletErrorCode(new Error('RPC is in cooldown')), 'network_error')
    assert.equal(normalizeWalletErrorCode({ code: -32603, message: 'RPC endpoint returned too many errors, the endpoint is in cooldown.' }), 'network_error')
})

test('a nested HTTP response contributes only its status, never the body a server sent', () => {
    const relayed = { message: 'Request failed with status code 500', response: { status: 500, data: { error: { code: 4001, message: 'User rejected the request' } } } }
    assert.equal(normalizeWalletErrorCode(relayed), 'unknown_error')
    assert.equal(isUserRejection(relayed), false)
    assert.equal(normalizeWalletErrorCode({ message: 'Request failed', response: { statusCode: 429, data: { message: 'User rejected the request' } } }), 'network_error')
    assert.equal(walletErrorDetails(relayed).message, 'Request failed with status code 500')
    assert.equal(walletErrorDetails(relayed).code, undefined)
})

test('a node that reports the balance as not sufficient is an insufficient-funds failure', () => {
    assert.equal(normalizeWalletErrorCode(new Error('CONTRACT_VALIDATE_ERROR: Validate TransferContract error, balance is not sufficient.')), 'insufficient_funds')
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

test('tree walk survives throwing getters, cycles and deep cause chains', () => {
    const throwingCause = { code: 4001, get cause() { throw new Error('unreadable cause') } }
    assert.equal(isUserRejection(throwingCause), true)
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

test('a JSON-RPC server error is only a decline when its text starts with the user declining', () => {
    for (const error of [
        { code: -32000, message: 'origin rejected the request' },
        { code: -32000, message: 'execution reverted: user rejected' },
        { code: '-32000', message: 'execution reverted: User rejected the request' },
        { code: -32099, message: 'relayer: user rejected fee quote' },
        { code: -32005, message: 'Request rejected: user denied rate limit exemption' },
    ]) {
        assert.equal(isUserRejection(error), false, error.message)
        assert.notEqual(normalizeWalletErrorCode(error), 'user_rejected', error.message)
    }
    // A WalletConnect wallet that answers a declined prompt with -32000 still reports the user.
    for (const message of ['User rejected the request.', 'User rejected.', 'user denied transaction signature', 'User has rejected the request.', 'The user has rejected the request.']) {
        assert.equal(normalizeWalletErrorCode({ code: -32000, message }), 'user_rejected', message)
    }
})

test('errorMessage reads Error, string and plain { message } errors, and falls back to String()', () => {
    assert.equal(errorMessage(new Error('boom')), 'boom')
    assert.equal(errorMessage('Reject request'), 'Reject request')
    assert.equal(errorMessage({ code: 113, message: 'An error occurred (USER_REFUSED_OP)' }), 'An error occurred (USER_REFUSED_OP)')
    assert.equal(errorMessage({ message: 42 }), '[object Object]')
    assert.equal(errorMessage(undefined), 'undefined')
    assert.equal(errorMessage(null), 'null')
    assert.equal(errorMessage(7), '7')
})
