import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveSwapFlow } from '../dist/esm/components/utils/resolveSwapFlow.js'

const network = { name: 'BASE_MAINNET', type: 'evm' }
const swapData = { use_deposit_address: false, source_network: network, destination_network: network }
const quote = { destination_token: { asset: 'USDC' } }
const waiting = { phase: 'awaiting_user_deposit', showWithdrawScreen: true }
const published = { phase: 'input_pending', showWithdrawScreen: false }
const frontend = [{ step: 'sign', status: 'action_required' }, { step: 'publish', status: 'waiting' }]
const resolve = input => resolveSwapFlow({ swapData, quote, resolved: waiting, ...input })

for (const [kind, evidence, input] of [
    ['manual-deposit', 'deposit-method', { swapData: { ...swapData, use_deposit_address: true } }],
    ['exchange-deposit', 'deposit-method', { swapData: { ...swapData, use_deposit_address: true, source_exchange: { name: 'coinbase' } } }],
    ['specialized-wallet', 'source-provider', { sourceProvider: 'hyperliquid' }],
    ['specialized-wallet', 'source-provider', { swapData: { ...swapData, source_network: { ...network, type: 'polymarket' } } }],
    ['wallet-transfer', 'legacy-transfer', { depositActions: [{ type: 'transfer' }] }],
    ['wallet-transfer', 'deposit-step', { depositActions: [{ step: 'deposit' }] }],
    ['frontend-swap', 'publish-step', { depositActions: frontend }],
    ['frontend-swap', 'publish-step', { depositActions: [{ step: 'publish' }] }],
    ['frontend-swap', 'frontend-signature', { depositActions: [{ step: 'sign', signing_standard: 'permit2_witness' }] }],
    ['frontend-swap', 'frontend-signature', { depositActions: [{ step: 'sign', signing_standard: 'eip2612' }] }],
    ['gasless-deposit', 'gasless-signature', { depositActions: [{ step: 'sign', signing_standard: 'permit2' }] }],
    ['gasless-deposit', 'gasless-authorization', { gaslessAuthorization: { kind: 'gasless' } }],
    ['gasless-deposit', 'gasless-authorization', { gaslessAuthorization: { status: 'published' } }],
    ['unresolved', 'missing-actions', {}],
    ['unresolved', 'missing-actions', { depositActions: [] }],
    ['unresolved', 'ambiguous-signature', { depositActions: [{ type: 'sign' }] }],
    ['unresolved', 'ambiguous-signature', { depositActions: [{ step: 'sign', signing_standard: 'eip3009' }] }],
    ['unresolved', 'ambiguous-signature', { depositActions: [{ step: 'approve_permit2' }] }],
    ['unresolved', 'unknown-actions', { depositActions: [{ step: 'future_step' }] }],
]) {
    test(`resolves ${kind} from ${evidence}: ${JSON.stringify(input)}`, () => {
        const flow = resolve(input)
        assert.equal(flow.kind, kind)
        assert.equal(flow.evidence, evidence)
    })
}

test('route geometry never determines the execution lane or hides a waiting transfer quote', () => {
    for (const destination of [network, { name: 'ETHEREUM_MAINNET' }]) {
        for (const depositActions of [undefined, [{ type: 'transfer' }], [{ step: 'deposit' }], [{ step: 'sign' }]]) {
            const flow = resolve({ swapData: { ...swapData, destination_network: destination }, depositActions, walletExecutionStarted: true })
            assert.equal(flow.compactQuote, false)
            assert.equal(flow.walletProgress, 'controls')
            assert.equal(flow.transferStage, 'withdraw')
            assert.equal(flow.sharesExecutionTransaction, false)
        }
    }
})

test('ordinary transfers compact only after submission and reopen on a fresh attempt', () => {
    for (const resolved of [waiting, published, { phase: 'completed', showWithdrawScreen: false }, waiting]) {
        const flow = resolve({ depositActions: [{ type: 'transfer' }], walletExecutionStarted: true, resolved })
        assert.equal(flow.kind, 'wallet-transfer')
        assert.equal(flow.compactQuote, !resolved.showWithdrawScreen)
        assert.equal(flow.processingProgress, 'transfers')
    }
})

test('the frontend workflow keeps its execution slot through every processing outcome', () => {
    for (const phase of ['input_pending', 'output_pending', 'settling_output', 'completed', 'failed', 'expired', 'pending_refund', 'refunded']) {
        const flow = resolve({ depositActions: frontend, resolved: { phase, showWithdrawScreen: false } })
        assert.equal(flow.kind, 'frontend-swap')
        assert.equal(flow.transferStage, undefined)
        assert.equal(flow.compactQuote, true)
        assert.equal(flow.processingProgress, ['failed', 'expired', 'pending_refund', 'refunded'].includes(phase) ? 'transfers' : 'workflow')
    }
    assert.equal(resolve({ depositActions: frontend }).compactQuote, false, 'critical quote confirmation stays expanded')
    assert.equal(resolve({ depositActions: frontend, walletExecutionStarted: true }).compactQuote, true)
})

test('explicit backend actions override stale gasless markers and mode preferences', () => {
    for (const depositActions of [frontend, [{ step: 'deposit' }], [{ type: 'transfer' }]]) {
        for (const gaslessEnabled of [false, true]) {
            const flow = resolve({ depositActions, gaslessEnabled, gaslessAuthorization: { kind: 'gasless', status: 'rejected' } })
            assert.notEqual(flow.kind, 'gasless-deposit')
        }
    }
    assert.equal(resolve({ depositActions: [{ step: 'sign' }], gaslessAuthorization: { status: 'rejected' } }).kind, 'unresolved', 'legacy expiry markers cannot identify a sign-only workflow')
})

test('incremental sign-only actions wait for lane evidence before compacting', () => {
    const signing = { depositActions: [{ step: 'sign' }], walletExecutionStarted: true }
    assert.equal(resolve(signing).kind, 'unresolved')
    assert.equal(resolve(signing).compactQuote, false)
    assert.equal(resolve({ ...signing, depositActions: frontend }).kind, 'frontend-swap')
    assert.equal(resolve({ ...signing, depositActions: frontend }).compactQuote, true)
    assert.equal(resolve({ ...signing, gaslessAuthorization: { status: 'published' } }).kind, 'gasless-deposit')
    assert.equal(resolve({ ...signing, gaslessAuthorization: { status: 'published' } }).compactQuote, false)
})

test('manual, specialized, refuel, and deposit-widget flows retain their own progress layout', () => {
    for (const input of [
        { swapData: { ...swapData, use_deposit_address: true } },
        { sourceProvider: 'hyperliquid' },
        { hasRefuel: true },
        { isDepositFlow: true },
    ]) {
        const flow = resolve({ depositActions: frontend, resolved: published, ...input })
        assert.equal(flow.processingProgress, 'transfers')
    }
    assert.equal(resolve({ swapData: { ...swapData, use_deposit_address: true }, resolved: published }).compactQuote, false)
})

test('transaction links share a receipt only with execution evidence, not just matching networks', () => {
    const input = { depositActions: [{ type: 'transfer' }], transactionHash: '0xinput', resolved: published }
    assert.equal(resolve(input).sharesExecutionTransaction, false)
    assert.equal(resolve({ ...input, outputTransactionHash: '0xoutput' }).sharesExecutionTransaction, false)
    assert.equal(resolve({ ...input, outputTransactionHash: '0xinput' }).sharesExecutionTransaction, true)
    assert.equal(resolve({ ...input, depositActions: frontend }).sharesExecutionTransaction, true)
})
