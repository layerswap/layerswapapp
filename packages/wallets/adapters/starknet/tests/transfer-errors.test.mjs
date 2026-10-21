import assert from 'node:assert/strict'
import test from 'node:test'
import { isUserRejection, normalizeWalletErrorCode } from '@layerswap/wallet-core/errors'
import { toTransferError } from '../dist/esm/transferProvider/toTransferError.js'

function expectShape(thrown, original, name) {
    assert.equal(thrown.name, name)
    assert.equal(thrown.cause, original)
    assert.equal(typeof thrown.message, 'string')
}

test('a Starknet wallet decline is declared, not inferred from the label', () => {
    const original = new Error('An error occurred (USER_REFUSED_OP)')
    const thrown = toTransferError(original)
    expectShape(thrown, original, 'TransactionRejected')
    assert.equal(thrown.reasonCode, 'user_rejected')
    assert.equal(normalizeWalletErrorCode(thrown), 'user_rejected')
    assert.equal(isUserRejection(thrown), true)
})

test('a plain-object Starknet wallet decline keeps its real message', () => {
    // get-starknet wallets reject with a plain { code, message } object, not an Error.
    const original = { code: 113, message: 'An error occurred (USER_REFUSED_OP)' }
    const thrown = toTransferError(original)
    expectShape(thrown, original, 'TransactionRejected')
    assert.equal(thrown.message, 'An error occurred (USER_REFUSED_OP)')
    assert.equal(thrown.reasonCode, 'user_rejected')
    assert.equal(isUserRejection(thrown), true)
})

test("'Execute failed' shows a wallet error and is reported as an unknown failure", () => {
    const original = new Error('Execute failed')
    const thrown = toTransferError(original)
    expectShape(thrown, original, 'UnexpectedErrorMessage')
    assert.equal(thrown.reasonCode, undefined)
    assert.notEqual(normalizeWalletErrorCode(thrown), 'user_rejected')
    assert.equal(normalizeWalletErrorCode(thrown), 'unknown_error')
    assert.equal(isUserRejection(thrown), false)
})

test('Ready X and OKX execution errors retain their diagnostic codes without becoming declines', () => {
    for (const [code, message, reasonCode] of [
        [163, 'UNKNOWN_ERROR', 'unknown_error'],
        [4100, 'The requested method and/or account has not been authorized by the user.', 'unauthorized'],
    ]) {
        const original = Object.assign(new Error(message), { name: 'WalletRPCError', code })
        const thrown = toTransferError(original)
        expectShape(thrown, original, 'UnexpectedErrorMessage')
        assert.equal(thrown.cause.code, code)
        assert.equal(normalizeWalletErrorCode(thrown), reasonCode)
        assert.equal(isUserRejection(thrown), false)
    }
})

test('other Starknet failures keep their labels and a string message', () => {
    const failed = toTransferError('failedTransfer')
    expectShape(failed, 'failedTransfer', 'TransactionFailed')
    assert.equal(failed.message, 'failedTransfer')
    assert.equal(isUserRejection(failed), false)

    const raw = new Error('Transaction rejected by sequencer')
    const unexpected = toTransferError(raw)
    expectShape(unexpected, raw, 'UnexpectedErrorMessage')
    assert.equal(unexpected.message, 'Transaction rejected by sequencer')
    assert.equal(isUserRejection(unexpected), false)

    // The old catch set `message` to the raw Error object; every message is a string now.
    const nested = new Error('No transaction hash returned')
    assert.equal(toTransferError(nested).message, 'No transaction hash returned')
})

test('execute diagnostics identify the selected signer and preserve the original exception', async () => {
    const { readFileSync } = await import('node:fs')
    const { default: ts } = await import('typescript')
    const module = { exports: {} }
    const source = readFileSync(new URL('../src/transferProvider/createStarknetTransfer.ts', import.meta.url), 'utf8')
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
    new Function('require', 'module', 'exports', outputText)(id => {
        if (id === './toTransferError') return { toTransferError }
        if (id === '@layerswap/utils') return { KnownInternalNames: { Networks: {} } }
        throw new Error(`Unexpected import: ${id}`)
    }, module, module.exports)
    for (const original of [new Error('Execute failed'), new Error('An error occurred (USER_REFUSED_OP)')]) {
        await assert.rejects(module.exports.createStarknetTransfer().executeTransfer({ callData: '[]' }, {
            id: 'argentX', providerName: 'Starknet', metadata: { starknetAccount: { execute: async () => { throw original } } },
        }), error => {
            assert.match(error.cause.message, /connector: argentX, provider: Starknet/)
            assert.equal(error.cause.cause, original)
            assert.equal(isUserRejection(error), original.message.includes('USER_REFUSED_OP'))
            return true
        })
    }
})
