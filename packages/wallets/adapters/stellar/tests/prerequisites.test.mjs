import assert from 'node:assert/strict'
import test from 'node:test'
import { Account, Keypair, MuxedAccount, Networks, Horizon, Operation, TransactionBuilder, Asset } from '@stellar/stellar-sdk'
import { evaluateStellarRecipient, stellarRecipientAddress, stellarStroops } from '../dist/esm/prerequisites/stellarRecipient.js'
import { createStellarPrerequisiteProvider } from '../dist/esm/prerequisites/createStellarPrerequisiteProvider.js'
import { stellarKitManager } from '../dist/esm/service/stellarKitManager.js'

const owner = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(71))
const issuer = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(72))
const other = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(73))
const token = { symbol: 'USDC', asset: 'USDC', contract: issuer.publicKey(), decimals: 7 }
const network = { name: 'STELLAR_TESTNET', type: 'stellar', chain_id: Networks.TESTNET, node_url: 'https://setup-horizon.example', nodes: [] }
const context = { destination: { network, token, address: owner.publicKey() }, receiveAmount: '10' }
const native = { asset_type: 'native', balance: '5.0000000', selling_liabilities: '0.0000000' }
const trustline = { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: issuer.publicKey(), balance: '0.0000000', limit: '100.0000000', buying_liabilities: '0.0000000', is_authorized: true }
const account = overrides => ({ subentry_count: 0, num_sponsoring: 0, num_sponsored: 0, balances: [native], ...overrides })
const evaluate = (value, ctx = context) => evaluateStellarRecipient(ctx, value, 5_000_000n, 100n)

test('inactive accounts show a concise activation message without an action', () => {
    const result = evaluate(undefined)
    assert.equal(result.status, 'blocked')
    assert.equal(result.title, 'Stellar account not active')
    assert.equal(result.description, 'This Stellar account must be activated with XLM before it can receive tokens.')
    assert.equal(result.action, undefined)
})

test('zero balance on the correct authorized trustline is ready; another issuer is not', () => {
    assert.equal(evaluate(account({ balances: [native, trustline] })).status, 'ready')
    const result = evaluate(account({ balances: [native, { ...trustline, asset_issuer: other.publicKey() }] }))
    assert.equal(result.status, 'required')
    assert.equal(result.action.wallet.address, owner.publicKey())
})

test('unauthorized and full trustlines remain blocked without a create action', () => {
    assert.equal(evaluate(account({ balances: [native, { ...trustline, is_authorized: false }] })).status, 'blocked')
    assert.equal(evaluate(account({ balances: [native, { ...trustline, balance: '91', buying_liabilities: '0' }] })).status, 'blocked')
    assert.equal(evaluate(account({ balances: [native, { ...trustline, balance: '89', buying_liabilities: '1' }] })).status, 'ready')
    assert.equal(evaluate(account({ balances: [native, { ...trustline, balance: '89', buying_liabilities: '1.0000001' }] })).status, 'blocked')
})

test('no-amount deposits expose finite capacity and require positive headroom', () => {
    const ctx = { ...context, receiveAmount: undefined }
    assert.equal(evaluate(account({ balances: [native, trustline] }), ctx).description, '100 USDC')
    assert.equal(evaluate(account({ balances: [native, { ...trustline, balance: '100' }] }), ctx).status, 'blocked')
})

test('funding shortfall includes sponsorship, subentries, selling liabilities and fee', () => {
    const result = evaluate(account({ subentry_count: 3, num_sponsoring: 2, num_sponsored: 1, balances: [{ ...native, balance: '3', selling_liabilities: '0.5' }] }))
    assert.equal(result.status, 'blocked')
    assert.match(result.description, /1\.00001 XLM/)
    assert.equal(evaluate(account({ num_sponsored: 2, balances: [{ ...native, balance: '0.50001' }] })).status, 'required')
    assert.equal(evaluate(account({ balances: [{ ...native, balance: '1.5' }] })).status, 'blocked')
})

test('native XLM bypasses trustlines and issuers need no trustline to themselves', () => {
    assert.equal(evaluate(undefined, { destination: { ...context.destination, token: { ...token, symbol: 'XLM', contract: null } } }).status, 'ready')
    assert.equal(evaluate(account(), { destination: { ...context.destination, address: issuer.publicKey() } }).status, 'ready')
})

test('muxed recipient checks use its G account without changing the destination', () => {
    const muxed = new MuxedAccount(new Account(owner.publicKey(), '0'), '123').accountId()
    const ctx = { ...context, destination: { ...context.destination, address: muxed } }
    assert.equal(stellarRecipientAddress(muxed), owner.publicKey())
    assert.equal(evaluate(account(), ctx).action.wallet.address, owner.publicKey())
    assert.equal(ctx.destination.address, muxed)
})

test('capacity math is exact at seven decimals and rounds fractional required stroops up', () => {
    assert.equal(stellarStroops('922337203685.4775807'), 9223372036854775807n)
    assert.equal(stellarStroops('1e-7'), 1n)
    assert.equal(stellarStroops('1.00000001', true), 10000001n)
    assert.throws(() => stellarStroops('NaN'))
    assert.throws(() => stellarStroops('-1'))
    assert.throws(() => evaluate(account({ num_sponsored: 10 })))
})

function mockHorizon(t, overrides = {}) {
    const state = { hasLine: false, submissions: 0, signatures: 0, closedAt: new Date().toISOString(), ...overrides }
    t.mock.method(Horizon.Server.prototype, 'root', async () => ({ network_passphrase: Networks.TESTNET }))
    t.mock.method(Horizon.Server.prototype, 'loadAccount', async address => {
        if (state.loadError) throw state.loadError
        const loaded = new Account(address, '42')
        Object.assign(loaded, account({ balances: state.hasLine ? [native, trustline] : [native] }))
        return loaded
    })
    t.mock.method(Horizon.Server.prototype, 'fetchBaseFee', async () => 100)
    t.mock.method(Horizon.Server.prototype, 'ledgers', () => ({ order() { return this }, limit() { return this }, async call() { return { records: [{ base_reserve_in_stroops: 5000000, closed_at: state.closedAt }] } } }))
    t.mock.method(Horizon.Server.prototype, 'transactions', () => ({ transaction() { return this }, async call() { if (state.hasLine) return { successful: true }; throw { status: 404 } } }))
    t.mock.method(stellarKitManager, 'revalidate', async (address, passphrase) => {
        assert.equal(address, owner.publicKey())
        assert.equal(passphrase, Networks.TESTNET)
        if (state.revalidateError) throw state.revalidateError
    })
    t.mock.method(stellarKitManager, 'signTransaction', async (xdr, passphrase) => {
        state.signatures++
        if (state.signError) throw state.signError
        await state.onSign?.()
        let transaction = TransactionBuilder.fromXdr(xdr, passphrase)
        assert.equal(transaction.operations.length, 1)
        assert.equal(transaction.operations[0].type, 'changeTrust')
        assert.equal(transaction.operations[0].line.getIssuer(), issuer.publicKey())
        assert.equal(transaction.fee, '100')
        if (state.tamper) transaction = new TransactionBuilder(new Account(owner.publicKey(), '42'), { fee: '100', networkPassphrase: passphrase })
            .addOperation(Operation.payment({ destination: other.publicKey(), asset: Asset.native(), amount: '1' })).setTimeout(180).build()
        transaction.sign(owner)
        return { signedTxXdr: transaction.toXdr(), signerAddress: state.wrongSigner ? other.publicKey() : owner.publicKey() }
    })
    t.mock.method(Horizon.Server.prototype, 'submitTransaction', async transaction => {
        state.submissions++
        if (state.submitError) throw state.submitError
        state.hasLine = true
        return { successful: true, hash: transaction.hash().toString('hex') }
    })
    return state
}
const execute = (provider, signal = new AbortController().signal, walletAddress = owner.publicKey()) => provider.execute(context, 'add-trustline', { wallet: { address: walletAddress }, signal })

test('setup signs only changeTrust and becomes ready after confirmation', async t => {
    const state = mockHorizon(t)
    const provider = createStellarPrerequisiteProvider()
    assert.equal((await provider.check(context)).status, 'required')
    await execute(provider)
    assert.equal(state.submissions, 1)
    assert.equal((await provider.check(context)).status, 'ready')
    await execute(provider)
    assert.equal(state.signatures, 1)
})

test('only a confirmed account 404 means inactive; outages propagate', async t => {
    const state = mockHorizon(t, { loadError: { response: { status: 404 } } })
    const provider = createStellarPrerequisiteProvider()
    assert.equal((await provider.check(context)).title, 'Stellar account not active')
    state.loadError = { response: { status: 503 } }
    await assert.rejects(provider.check(context))
})

test('wrong wallet, network mismatch and aborted requests never submit', async t => {
    const state = mockHorizon(t)
    const provider = createStellarPrerequisiteProvider()
    await assert.rejects(execute(provider, undefined, other.publicKey()), /owns the destination/)
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(execute(provider, controller.signal))
    state.revalidateError = new Error('Wrong network')
    await assert.rejects(execute(provider), /Wrong network/)
    assert.equal(state.signatures, 0)
    assert.equal(state.submissions, 0)
})

test('altered envelopes and wrong signer responses are rejected before submission', async t => {
    const state = mockHorizon(t, { tamper: true })
    const provider = createStellarPrerequisiteProvider()
    await assert.rejects(execute(provider), /changed the token setup transaction/)
    state.tamper = false
    state.wrongSigner = true
    await assert.rejects(execute(provider), /different Stellar account/)
    assert.equal(state.submissions, 0)
})

test('user rejection is retryable without submitting', async t => {
    const state = mockHorizon(t, { signError: new Error('User rejected') })
    const provider = createStellarPrerequisiteProvider()
    await assert.rejects(execute(provider), /cancelled/)
    assert.equal(state.submissions, 0)
    state.signError = undefined
    await execute(provider)
    assert.equal(state.submissions, 1)
})

test('ambiguous submission prevents another signature until on-chain resolution', async t => {
    const state = mockHorizon(t, { submitError: new Error('Network timeout') })
    const provider = createStellarPrerequisiteProvider()
    await assert.rejects(execute(provider), /confirmation is unavailable/)
    assert.equal((await provider.check(context)).status, 'pending')
    await assert.rejects(execute(provider))
    assert.equal(state.signatures, 1)
    state.hasLine = true
    assert.equal((await createStellarPrerequisiteProvider().check(context)).status, 'ready')
})

test('external connection adapters get guidance without an incompatible signer action', async t => {
    mockHorizon(t)
    const result = await createStellarPrerequisiteProvider({ canSign: false }).check(context)
    assert.equal(result.status, 'required')
    assert.equal(result.action, undefined)
})

test('an issued asset without an issuer cannot bypass verification', async () => {
    const provider = createStellarPrerequisiteProvider()
    const invalid = { ...context, destination: { ...context.destination, token: { ...token, contract: null } } }
    assert.equal(provider.supports(invalid), true)
    await assert.rejects(provider.check(invalid), /Unsupported native Stellar asset/)
})

test('concurrent setup attempts cannot request a second signature', async t => {
    let finishSigning
    const signing = new Promise(resolve => { finishSigning = resolve })
    let signatureRequested
    const requested = new Promise(resolve => { signatureRequested = resolve })
    const state = mockHorizon(t, { onSign: async () => { signatureRequested(); await signing } })
    const provider = createStellarPrerequisiteProvider()
    const first = execute(provider)
    await requested
    await assert.rejects(execute(createStellarPrerequisiteProvider()), /already in progress/)
    finishSigning()
    await first
    assert.equal(state.signatures, 1)
    assert.equal(state.submissions, 1)
})

test('leaving during signing prevents submission of the returned signature', async t => {
    const controller = new AbortController()
    const state = mockHorizon(t, { onSign: () => controller.abort() })
    await assert.rejects(execute(createStellarPrerequisiteProvider(), controller.signal))
    assert.equal(state.signatures, 1)
    assert.equal(state.submissions, 0)
})

test('ambiguous submission can be retried only after its ledger-time expiry', async t => {
    const state = mockHorizon(t, { submitError: new Error('Connection lost') })
    const provider = createStellarPrerequisiteProvider()
    await assert.rejects(execute(provider), /confirmation is unavailable/)
    assert.equal((await provider.check(context)).status, 'pending')
    state.closedAt = new Date(Date.now() + 300_000).toISOString()
    assert.equal((await provider.check(context)).status, 'required')
    state.submitError = undefined
    await execute(provider)
    assert.equal(state.signatures, 2)
})
