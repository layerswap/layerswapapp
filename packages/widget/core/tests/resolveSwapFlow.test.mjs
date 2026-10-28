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

const draftData = { ...swapData, source_token: { symbol: 'ARB', contract: `0x${'1'.repeat(40)}` } }

for (const provider of ['0X', 'FLY', 'UNISWAP']) {
    test(`${provider} draft resolves batching before creation`, () => {
        const input = { isDraft: true, swapData: draftData, quote: { ...quote, path: [{ provider, order: 0 }] } }
        const batch = resolve({ ...input, atomicBatchAvailable: true })
        assert.equal(batch.kind, 'atomic-batch')
        assert.equal(batch.resolution, 'resolved')
        assert.equal(batch.actionButtonText, 'Approve and swap')
        assert.equal(batch.compactQuote, false)
        assert.equal(batch.walletProgress, 'controls')
        const standard = resolve({ ...input, atomicBatchAvailable: false })
        assert.equal(standard.kind, 'frontend-swap')
        assert.equal(standard.actionButtonText, 'Sign to swap')
        const gasless = resolve({ ...input, atomicBatchAvailable: true, gaslessEnabled: true })
        assert.equal(gasless.kind, 'gasless-deposit')
        assert.equal(gasless.actionButtonText, 'Sign to swap')
    })
}

test('a regular bridge never becomes a batch because its wallet supports batching', () => {
    for (const path of [[{ provider: 'ACROSS', order: 0 }], [{ provider: '0X', order: 0 }, { provider: 'ACROSS', order: 1 }]]) {
        const flow = resolve({ isDraft: true, atomicBatchAvailable: true,
            swapData: { ...draftData, destination_network: { name: 'ARBITRUM_MAINNET', type: 'evm' } }, quote: { ...quote, path } })
        assert.equal(flow.kind, 'wallet-transfer')
        assert.equal(flow.actionButtonText, 'Send from wallet')
        assert.equal(flow.compactQuote, false)
    }
})

test('native frontend swaps keep their single transaction even with batching support', () => {
    const flow = resolve({ isDraft: true, atomicBatchAvailable: true,
        swapData: { ...draftData, source_token: { symbol: 'ETH' } },
        quote: { ...quote, path: [{ provider: '0X', order: 0 }] } })
    assert.equal(flow.kind, 'frontend-swap')
    assert.equal(flow.actionButtonText, 'Confirm swap')
})

test('a created swap never uses draft predictions to replace its actual actions', () => {
    for (const depositActions of [undefined, [], [{ type: 'transfer', step: 'deposit', status: 'action_required' }]]) {
        const flow = resolve({ isDraft: false, atomicBatchAvailable: true, gaslessEnabled: true,
            swapData: { ...draftData, id: 'created' }, quote: { ...quote, path: [{ provider: '0X', order: 0 }] }, depositActions })
        assert.notEqual(flow.kind, 'atomic-batch')
        assert.notEqual(flow.kind, 'gasless-deposit')
    }
    const single = resolve({ isDraft: true, atomicBatchAvailable: true, swapData: draftData,
        quote: { ...quote, path: [{ provider: '0X', order: 0 }] },
        depositActions: [{ type: 'transfer', step: 'publish', status: 'action_required' }] })
    assert.equal(single.kind, 'frontend-swap')
    assert.equal(single.actionButtonText, 'Confirm swap')
    assert.equal(resolve({ isDraft: true, atomicBatchAvailable: true }).resolution, 'pending')
})

for (const [name, kind, actions, label] of [
    ['atomic approval', 'atomic-batch', [{ type: 'send_calls', step: 'publish', calls: [{}, {}] }], 'Approve and swap'],
    ['atomic funded allowance', 'atomic-batch', [{ type: 'send_calls', step: 'publish', calls: [{}] }], 'Confirm swap'],
    ['self-paid signing', 'frontend-swap', [{ type: 'sign', step: 'sign', signing_standard: 'eip3009' }, { step: 'publish' }], 'Sign to swap'],
    ['native publication', 'frontend-swap', [{ type: 'transfer', step: 'publish' }], 'Confirm swap'],
    ['ordinary bridge', 'wallet-transfer', [{ type: 'transfer', step: 'deposit' }], 'Send from wallet'],
    ['EIP-3009 gasless', 'gasless-deposit', [{ type: 'sign', step: 'sign', signing_standard: 'eip3009' }], 'Sign to swap'],
    ['Permit2 gasless', 'gasless-deposit', [{ type: 'sign', step: 'sign', signing_standard: 'permit2' }], 'Sign to swap'],
]) {
    test(`${name} resolves from the prepared backend workflow`, () => {
        const flow = resolve({ swapData: { ...swapData, quote_revision: 1 },
            depositActions: actions.map(action => ({ ...action, status: 'action_required' })) })
        assert.equal(flow.resolution, 'resolved')
        assert.equal(flow.kind, kind)
        assert.equal(flow.actionButtonText, label)
        assert.equal(flow.showSwapProgress, kind === 'atomic-batch' || kind === 'frontend-swap')
    })
}

test('frontend settlement metadata distinguishes a gasless swap from a same-network depository transfer', () => {
    const depositActions = [{ step: 'sign', signing_standard: 'eip3009', status: 'completed' }]
    const deposit = resolve({ depositActions })
    const swap = resolve({ depositActions, swapData: { ...swapData, quote_revision: 2 } })
    assert.equal(deposit.processingTitle, 'transfer')
    assert.equal(deposit.sharesExecutionTransaction, false)
    assert.equal(swap.processingTitle, 'swap')
    assert.equal(swap.sharesExecutionTransaction, true)
})

test('an observed regular transfer resolves from the backend empty-plan contract after reload', () => {
    const flow = resolve({ swapData: { ...swapData, id: 'observed' }, depositActions: [] })
    assert.equal(flow.kind, 'wallet-transfer')
    assert.equal(flow.resolution, 'resolved')
    assert.equal(resolve({ swapData: { ...swapData, id: 'loading' } }).resolution, 'pending')
})

test('unknown actionable workflows stay unsupported even with a saved execution kind', () => {
    const flow = resolve({ transaction: { kind: 'wallet-transfer' },
        depositActions: [{ type: 'transfer', step: 'future_step', status: 'action_required' }] })
    assert.equal(flow.resolution, 'unsupported')
    assert.equal(flow.actionButtonText, undefined)
})

for (const status of ['pending', 'completed', 'failed']) {
    test(`backend ${status} history identifies every rail without local storage`, () => {
        for (const [kind, plan] of [
            ['atomic-batch', [{ step: 'approve' }, { step: 'publish' }]],
            ['frontend-swap', [{ step: 'sign', signing_standard: 'eip3009' }, { step: 'publish' }]],
            ['frontend-swap', [{ step: 'publish' }]],
            ['gasless-deposit', [{ step: 'sign', signing_standard: 'eip3009' }]],
            ['wallet-transfer', [{ step: 'deposit' }]],
        ]) {
            const flow = resolve({ swapData: { ...swapData, quote_revision: kind === 'wallet-transfer' ? undefined : 1 },
                depositActions: plan.map(action => ({ ...action, status })) })
            assert.equal(flow.kind, kind)
            assert.equal(flow.resolution, 'resolved')
        }
    })
}

for (const [kind, evidence, input] of [
    ['manual-deposit', 'deposit-method', { swapData: { ...swapData, use_deposit_address: true } }],
    ['exchange-deposit', 'deposit-method', { swapData: { ...swapData, use_deposit_address: true, source_exchange: { name: 'coinbase' } } }],
    ['specialized-wallet', 'source-provider', { sourceProvider: 'hyperliquid' }],
    ['specialized-wallet', 'source-provider', { sourceProvider: 'third-party' }],
    ['wallet-transfer', 'legacy-transfer', { depositActions: [{ type: 'transfer' }] }],
    ['wallet-transfer', 'deposit-step', { depositActions: [{ step: 'deposit' }] }],
    ['frontend-swap', 'publish-step', { depositActions: frontend }],
    ['frontend-swap', 'publish-step', { depositActions: [{ type: 'transfer', step: 'publish', status: 'action_required' }] }],
    ['atomic-batch', 'atomic-calls', { depositActions: [{ type: 'send_calls', step: 'publish', calls: [] }] }],
    ['atomic-batch', 'atomic-approval', { depositActions: [{ step: 'approve', status: 'completed' }, { step: 'publish', status: 'pending' }] }],
    ['frontend-swap', 'frontend-signature', { depositActions: [{ step: 'sign', signing_standard: 'permit2_witness' }] }],
    ['frontend-swap', 'frontend-signature', { depositActions: [{ step: 'sign', signing_standard: 'eip2612' }] }],
    ['gasless-deposit', 'gasless-signature', { depositActions: [{ step: 'sign', signing_standard: 'permit2' }] }],
    ['gasless-deposit', 'gasless-authorization', { gaslessAuthorization: { kind: 'gasless' } }],
    ['gasless-deposit', 'gasless-authorization', { gaslessAuthorization: { status: 'published' } }],
    ['unresolved', 'missing-actions', {}],
    ['unresolved', 'missing-actions', { depositActions: [] }],
    ['unresolved', 'ambiguous-signature', { depositActions: [{ type: 'sign' }] }],
    ['gasless-deposit', 'gasless-signature', { depositActions: [{ step: 'sign', signing_standard: 'eip3009' }] }],
    ['unresolved', 'ambiguous-signature', { depositActions: [{ step: 'approve_permit2' }] }],
    ['unresolved', 'ambiguous-publication', { depositActions: [{ step: 'publish' }] }],
    ['unresolved', 'ambiguous-publication', { depositActions: [{ step: 'publish', status: 'waiting' }] }],
    ['unresolved', 'ambiguous-publication', { depositActions: [{ step: 'publish', status: 'action_required' }] }],
    ['unresolved', 'ambiguous-publication', { depositActions: [{ step: 'publish', status: 'completed' }] }],
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

test('a standard transfer receipt shows compact confirmation while the swap API still awaits a deposit', () => {
    for (const depositActions of [undefined, [{ type: 'transfer', step: 'deposit', status: 'action_required' }]]) {
        const flow = resolve({
            swapData: { ...swapData, destination_network: { name: 'ARBITRUM_MAINNET' } },
            depositActions,
            transaction: { kind: 'wallet-transfer' },
            transactionHash: '0xsubmitted',
            walletExecutionStarted: false,
        })
        assert.equal(flow.processingTitle, 'transfer')
        assert.equal(flow.walletProgress, 'workflow')
        assert.equal(flow.compactQuote, true)
        assert.equal(flow.transferStage, 'withdraw', 'receipt presentation does not advance the fetched swap phase')
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

test('atomic calls keep their own identity and presentation through every swap outcome', () => {
    for (const calls of [[{ to: 'swap' }], [{ to: 'approve' }, { to: 'swap' }]]) {
        for (const phase of ['awaiting_user_deposit', 'input_pending', 'output_pending', 'settling_output', 'completed', 'failed', 'expired', 'pending_refund', 'refunded']) {
            const flow = resolve({
                depositActions: [{ type: 'send_calls', step: 'publish', status: 'pending', calls }],
                walletExecutionStarted: true,
                resolved: { phase, showWithdrawScreen: phase === 'awaiting_user_deposit' },
                transactionHash: 'input',
            })
            assert.equal(flow.kind, 'atomic-batch')
            assert.equal(flow.evidence, 'atomic-calls')
            assert.equal(flow.walletProgress, 'workflow')
            assert.equal(flow.transferStage, undefined)
            assert.equal(flow.compactQuote, true)
            assert.equal(flow.processingTitle, 'swap')
            assert.equal(flow.sharesExecutionTransaction, true)
            assert.equal(flow.processingProgress, ['input_pending', 'output_pending', 'settling_output', 'completed'].includes(phase) ? 'workflow' : 'transfers')
        }
    }
})

test('a sufficient-allowance batch retains its confirmed rail when the API drops call data', () => {
    const prepared = resolve({ depositActions: [{ type: 'send_calls', step: 'publish', status: 'action_required' }] })
    const transaction = { kind: prepared.kind }
    for (const status of ['waiting', 'pending', 'completed', 'failed']) {
        const input = { depositActions: [{ step: 'publish', status }], transaction, resolved: published }
        assert.equal(resolve(input).kind, 'atomic-batch')
        assert.equal(resolve({ ...input, transaction: undefined }).kind, 'unresolved', 'a status-only publication cannot identify the rail on a new device')
    }
})

test('an active batch recovery record identifies the flow without advancing its phase', () => {
    const input = { transaction: { kind: 'atomic-batch' } }
    const flow = resolve(input)
    assert.equal(flow.kind, 'atomic-batch')
    assert.equal(flow.evidence, 'atomic-transaction')
    assert.equal(flow.transferStage, 'withdraw')
    assert.equal(flow.compactQuote, false)
    assert.equal(resolve({ transaction: { kind: 'transaction' } }).kind, 'unresolved')
    assert.equal(resolve({}).kind, 'unresolved')
})

test('a restored wallet receipt keeps the compact progress layout without a local execution flag', () => {
    for (const kind of ['atomic-batch', 'frontend-swap']) {
        for (const depositActions of [undefined, [], [{ step: 'publish', status: 'pending' }]]) {
            const flow = resolve({
                transaction: { kind },
                transactionHash: '0xsubmitted',
                walletExecutionStarted: false,
                depositActions,
            })
            assert.equal(flow.walletProgress, 'workflow')
            assert.equal(flow.compactQuote, true)
            assert.equal(flow.transferStage, undefined)
        }
        const prepared = resolve({ transaction: { kind }, walletExecutionStarted: false })
        assert.equal(prepared.compactQuote, false, 'execution identity alone is not a submitted transaction')
        assert.equal(prepared.walletProgress, 'controls')
    }
})

test('confirmed wallet rails survive missing action history', () => {
    for (const depositActions of [
        [{ type: 'transfer', step: 'deposit' }],
        frontend,
        [{ type: 'send_calls', step: 'publish' }],
        [{ type: 'sign', step: 'sign', signing_standard: 'permit2' }],
    ]) {
        const prepared = resolve({ depositActions })
        const transaction = { kind: prepared.kind }
        assert.equal(resolve({ transaction }).kind, prepared.kind)
        assert.equal(resolve({}).kind, 'unresolved')
    }
})

test('native publication is distinct from an ERC-20 publication with missing execution history', () => {
    const depositActions = [{ step: 'publish', status: 'completed' }]
    assert.equal(resolve({ depositActions, swapData: { ...swapData, source_token: { symbol: 'ETH', contract: null } } }).kind, 'frontend-swap')
    assert.equal(resolve({ depositActions, swapData: { ...swapData, source_token: { symbol: 'USDC', contract: '0xtoken' } } }).kind, 'unresolved')
    assert.equal(resolve({ depositActions, swapData: { ...swapData, source_token: {} } }).kind, 'unresolved')
    assert.equal(resolve({ depositActions, swapData: { ...swapData, source_network: { name: 'SOLANA_MAINNET', type: 'solana' }, source_token: { symbol: 'USDC', contract: 'mint' } } }).kind, 'frontend-swap')
})

test('manual and specialized sources keep their identity even with a batch-shaped deposit action', () => {
    const depositActions = [{ type: 'send_calls', step: 'publish' }]
    assert.equal(resolve({ depositActions, swapData: { ...swapData, use_deposit_address: true } }).kind, 'manual-deposit')
    for (const sourceProvider of ['hyperliquid', 'polymarket', 'third-party']) {
        const flow = resolve({ depositActions, sourceProvider })
        assert.equal(flow.kind, 'specialized-wallet')
        assert.equal(flow.sourceProvider, sourceProvider)
    }
})

test('new explicit execution evidence takes precedence over an earlier observation', () => {
    const transaction = { kind: 'atomic-batch' }
    const transfer = [{ type: 'transfer', step: 'publish', status: 'action_required' }]
    assert.equal(resolve({ transaction, depositActions: transfer }).kind, 'frontend-swap')
    assert.equal(resolve({ transaction: { kind: 'frontend-swap' }, depositActions: [{ type: 'send_calls', step: 'publish' }] }).kind, 'atomic-batch')
    for (const kind of ['gasless-deposit', 'wallet-transfer']) {
        const flow = resolve({ transaction: { kind }, depositActions: [{ step: 'publish', status: 'completed' }] })
        assert.equal(flow.kind, 'unresolved', 'publication contradicts a gasless or plain deposit identity')
    }
})

test('completed allowance placeholders preserve the known single-transaction execution', () => {
    const depositActions = [{ step: 'approve', status: 'completed' }, { step: 'publish', status: 'completed' }]
    const flow = resolve({ transaction: { kind: 'frontend-swap' }, depositActions })
    assert.equal(flow.kind, 'frontend-swap')
    assert.equal(flow.evidence, 'stored-transaction')
    const actionable = [{ type: 'send_calls', step: 'publish', status: 'action_required', calls: [{}, {}] }]
    assert.equal(resolve({ transaction: { kind: 'frontend-swap' }, depositActions: actionable }).kind, 'atomic-batch')
})
