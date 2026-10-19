import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { formatUnits, parseUnits } from 'viem'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

function loadProvider(path, imports) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(name => {
        if (name in imports) return imports[name]
        throw new Error(`Unexpected dependency: ${name}`)
    }, module, module.exports)
    return module.exports
}

const polymarketProtocol = loadProvider('../src/additionalProviders/polymarket/protocol.ts', {})
const polymarketRelayer = loadProvider('../src/additionalProviders/polymarket/relayerClient.ts', {
    './constants': { POLYMARKET_RELAYER_PROXY_URL: '/api/polymarket/relay' },
    './protocol': polymarketProtocol,
})

const { default: KnownInternalNames } = loadProvider('../../../../utils/src/knownIds.ts', {})
const widgetTypes = {
    ...loadProvider('../../../../widget/types/src/extendedRouteAvailability.ts', {}),
    ...loadProvider('../../../../widget/types/src/resolvers/extendedRoutes.ts', {}),
}
const routes = loadProvider('../src/additionalProviders/hyperliquid/routes.ts', {
    '@layerswap/utils': { KnownInternalNames },
})
const constants = loadProvider('../src/additionalProviders/hyperliquid/constants.ts', {
    '@layerswap/widget-types': widgetTypes,
    './routes': routes,
})
const withdrawalPlanner = loadProvider('../src/additionalProviders/hyperliquid/planWithdrawal.ts', {
    './constants': constants,
    viem: { formatUnits },
})
const { HyperliquidClient } = loadProvider('../src/additionalProviders/hyperliquid/hyperliquidClient.ts', {
    '@layerswap/utils': {},
    viem: { parseUnits },
})
const { hyperliquidProvider } = loadProvider('../src/additionalProviders/hyperliquid/hyperliquidExtendedRouteProvider.ts', {
    '@layerswap/widget-types': widgetTypes,
    './routes': routes,
    './constants': constants,
})
const amounts = loadProvider('../../../../widget/core/src/lib/extendedRoutes/amounts.ts', {})
const registry = loadProvider('../../../../widget/core/src/lib/extendedRoutes/registry.ts', {
    '@layerswap/widget-types': widgetTypes,
    './amounts': amounts,
})
registry.setExtendedRouteProviders([hyperliquidProvider])

function createWithdrawal(providerName, failure, split = { spot: '100000000000', perps: '0' }, relayer = {}) {
    const events = []
    const signedAmounts = []
    const signedTransfers = []
    const failed = new Error('Request timed out')
    const sign = async (_config, _providerConfig, request) => {
        events.push('sign')
        if (providerName === 'Hyperliquid') signedAmounts.push(request.amount)
        if (failure === 'sign') throw failed
        return { action: {}, signature: {} }
    }
    const submit = async () => {
        events.push('submit')
        if (failure === 'submit') throw failed
        if (failure instanceof Error) throw failure
        if (failure?.status === 'err') return failure
        return { status: 'ok', transactionID: 'accepted' }
    }
    const common = {
        '@layerswap/widget-types': { NetworkType: { Hyperliquid: 'hyperliquid' } },
        '@wagmi/core': { switchChain: async () => {}, getWalletClient: async () => ({}) },
        '../../evmUtils/resolveError': { isEvmUserRejection: () => false },
        '@layerswap/wallet-core/errors': { userRejectedError: () => assert.fail('not a rejection') },
    }
    let provider
    if (providerName === 'Hyperliquid') {
        const { createHyperliquidTransfer } = loadProvider('../src/additionalProviders/hyperliquid/createHyperliquidTransferProvider.ts', {
            ...common,
            viem: { formatUnits, parseUnits },
            '../../service/getEvmConfig': { getEvmConfig: () => ({}) },
            './hyperliquidClient': { HyperliquidClient: class extends HyperliquidClient {
                getSpotClearinghouseState = async () => ({ balances: [{ coin: 'USDC', total: split.spot.toString(), hold: split.hold ?? '0' }] })
                getClearinghouseState = async () => ({ withdrawable: split.perps.toString() })
                withdraw = submit
                usdClassTransfer = async () => { events.push('consolidate'); return { status: 'ok' } }
            } },
            './withdraw': {
                signSendToEvm: sign,
                signUsdClassTransfer: async (_config, _hlConfig, request) => {
                    signedTransfers.push(request)
                    return { action: {}, signature: {} }
                },
            },
            './planWithdrawal': withdrawalPlanner,
            './constants': constants,
            './resolveError': loadProvider('../src/additionalProviders/hyperliquid/resolveError.ts', {}),
        })
        provider = createHyperliquidTransfer()
    } else {
        const { createPolymarketTransferProvider } = loadProvider('../src/additionalProviders/polymarket/createPolymarketTransferProvider.ts', {
            ...common,
            viem: { createPublicClient: () => ({}), decodeAbiParameters: () => ['id', 'usdc', 'receiver', 1n] },
            '../../evmUtils/resolveChain': { default: () => ({}) },
            '../../evmUtils/resolveTransports': { resolveFallbackTransport: () => ({}) },
            './funder': {
                resolvePolymarketHolding: async () => ({ entries: [{}], total: 10 }),
                selectPolymarketFunder: async () => ({ executable: [{}], selected: { type: 'safe', address: 'funder' } }),
            },
            './depositWithdraw': { buildPolymarketDepositCalls: () => [] },
            './safeWithdraw': { buildSafeBatchRequest: sign },
            './relayerClient': { ...polymarketRelayer, getRelayerNonce: async () => '1', isPolymarketDeployed: async () => true, submitRelayerTransaction: submit, ...relayer },
            './constants': { resolvePolymarketConfig: () => ({}), POLYMARKET_USDC_E_ADDRESS: 'usdc' },
            './resolveError': { resolvePolymarketError: () => assert.fail('not a provider refusal') },
        })
        provider = createPolymarketTransferProvider({}, () => true)
    }
    return {
        events, failed, signedAmounts, signedTransfers,
        execute: (params = {}) => provider.executeTransfer({
            network: { name: KnownInternalNames.Networks.HyperliquidMainnet },
            amount: 1, amountInBaseUnits: '1000000',
            sourceAddress: 'source', depositAddress: 'deposit', callData: '0x12345678',
            ...params,
            token: { decimals: 6, symbol: 'USDC', asset: 'USDC', ...params.token },
            onSubmissionStateChange: phase => {
                events.push(phase)
                params.onSubmissionStateChange?.(phase)
            },
        }),
    }
}

function createProviderExecution(t) {
    const saved = new Map()
    const storage = {
        getItem: key => saved.get(key) ?? null,
        setItem: (key, value) => saved.set(key, value),
        removeItem: key => saved.delete(key),
    }
    const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
    t.after(() => {
        if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
        else delete globalThis.localStorage
    })
    const statuses = { Pending: 'pending', Failed: 'failed' }
    const transactionStore = loadProvider('../../../../widget/core/src/stores/swapTransactionStore.tsx', {
        zustand: { create },
        'zustand/middleware': { persist, createJSONStorage: () => createJSONStorage(() => storage) },
        '../lib/apiClients/layerSwapApiClient': { BackendTransactionStatus: statuses },
    })
    const { useSwapTransactionStore: store } = transactionStore
    const { executeProviderWithdrawal } = loadProvider('../../../../widget/core/src/components/Pages/Swap/Withdraw/WithdrawalProviders/executeProviderWithdrawal.ts', {
        '@layerswap/wallet-core/errors': { isUserRejection: () => false },
        '@/lib/apiClients/layerSwapApiClient': {
            default: class {
                GetSwapAsync = async id => ({ data: { swap: { id, status: 'user_transfer_pending', transactions: [] } } })
            },
            BackendTransactionStatus: statuses,
            TransactionType: { Input: 'input' },
        },
        '@/helpers/swapProgress': { hasSwapExecutionProgress: () => false },
        '@/stores/swapTransactionStore': transactionStore,
    })
    return {
        store,
        execute: flow => executeProviderWithdrawal({
            swapId: 'swap-1', sourceAddress: 'source', prepare: async () => ({}), onReconcile: async () => {},
            execute: (_, onSubmissionStateChange) => flow.execute({ onSubmissionStateChange }),
        }),
        reload: async () => {
            const persisted = storage.getItem('swapTransactions')
            store.setState({ swapTransactions: {}, stepTransactions: {}, pendingSubmissions: {} })
            storage.setItem('swapTransactions', persisted)
            await store.persist.rehydrate()
        },
    }
}

for (const reload of [false, true]) {
    test(`Polymarket retries a disabled-provider refusal on the same swap${reload ? ' after reload' : ''}`, async t => {
        const flow = createWithdrawal('Polymarket', undefined, undefined, { submitRelayerTransaction: polymarketRelayer.submitRelayerTransaction })
        const execution = createProviderExecution(t)
        let submissions = 0
        t.mock.method(globalThis, 'fetch', async (_url, init) => {
            assert.equal(init.method, 'POST')
            submissions++
            return submissions === 1
                ? new Response(JSON.stringify({ error: polymarketProtocol.PROVIDER_DISABLED_CODE }), { status: 404 })
                : new Response(JSON.stringify({ transactionID: 'accepted', state: 'STATE_NEW' }))
        })

        await assert.rejects(execution.execute(flow), {
            header: 'Polymarket is unavailable',
            message: 'Polymarket withdrawals are temporarily unavailable. Please try again later.',
        })
        assert.deepEqual(flow.events, ['preparing', 'sign', 'submitting', 'not_submitted'])
        assert.deepEqual(execution.store.getState().pendingSubmissions, {})
        assert.deepEqual(execution.store.getState().swapTransactions, {})
        if (reload) await execution.reload()

        assert.equal(await execution.execute(flow), '')
        assert.equal(submissions, 2, 'the refused withdrawal can submit again')
        assert.deepEqual(execution.store.getState().swapTransactions, {}, 'a provider request without a hash is not a transaction receipt')
        assert.deepEqual(execution.store.getState().pendingSubmissions, { 'swap-1': true }, 'reconcile the accepted provider request before retry')
    })
}

for (const [label, response] of [
    ['transport failure', () => { throw new Error('provider_disabled') }],
    ['unclassified proxy error', () => new Response(JSON.stringify({ error: 'Upstream unavailable' }), { status: 404 })],
    ['malformed submit response', () => new Response(JSON.stringify({ state: 'STATE_NEW' }))],
]) {
    test(`Polymarket keeps ${label} blocked after reload`, async t => {
        const flow = createWithdrawal('Polymarket', undefined, undefined, { submitRelayerTransaction: polymarketRelayer.submitRelayerTransaction })
        const execution = createProviderExecution(t)
        let submissions = 0
        t.mock.method(globalThis, 'fetch', async () => { submissions++; return response() })

        await assert.rejects(execution.execute(flow))
        assert.deepEqual(flow.events, ['preparing', 'sign', 'submitting'])
        assert.equal(execution.store.getState().pendingSubmissions['swap-1'], true)
        await execution.reload()
        await assert.rejects(execution.execute(flow), { header: 'Withdrawal status unknown' })
        assert.equal(submissions, 1, 'an uncertain submission cannot send a second request')
        assert.equal(execution.store.getState().pendingSubmissions['swap-1'], true)
    })
}

for (const [baseUnits, decimals, expected] of [
    ['1234567', 6, '1.434567'],
    ['1', 6, '0.200001'],
    ['9007199254740993', 6, '9007199254.940993'],
    ['1234567890123456789', 18, '1.434567890123456789'],
]) {
    test(`Hyperliquid adds the forwarding fee without losing base-unit precision: ${baseUnits} with ${decimals} decimals`, async () => {
        const flow = createWithdrawal('Hyperliquid')
        await flow.execute({ amount: 99, amountInBaseUnits: baseUnits, token: { decimals } })
        assert.deepEqual(flow.signedAmounts, [expected])
    })
}

for (const [source, destination, intermediate] of [
    [KnownInternalNames.Networks.HyperliquidMainnet, KnownInternalNames.Networks.EthereumMainnet, KnownInternalNames.Networks.AvalancheMainnet],
    [KnownInternalNames.Networks.HyperliquidMainnet, KnownInternalNames.Networks.BaseMainnet, KnownInternalNames.Networks.ArbitrumMainnet],
    [KnownInternalNames.Networks.HyperliquidTestnet, KnownInternalNames.Networks.BaseSepolia, KnownInternalNames.Networks.ArbitrumSepolia],
]) {
    test(`Hyperliquid funds the backend deposit after forwarding through ${intermediate}`, async () => {
        const sourceRoutes = [{
            name: intermediate,
            deposit_methods: ['deposit_address'],
            tokens: [{ symbol: 'USDC', status: 'active' }],
        }]
        const plan = registry.resolveExtendedRoutePlan({
            sourceNetworkName: source,
            sourceTokenSymbol: 'USDC',
            destinationNetworkName: destination,
            destinationTokenSymbol: 'USDC',
            sourceAmount: '10',
            availableRoutes: sourceRoutes,
        })
        assert.equal(plan.mapping.real.networkName, intermediate)
        assert.equal(plan.realAmount, '9.8')

        const flow = createWithdrawal('Hyperliquid')
        await flow.execute({
            network: { name: source },
            destinationNetwork: { name: destination },
            destinationToken: { symbol: 'USDC' },
            sourceRoutes,
            amount: Number(plan.realAmount),
            amountInBaseUnits: parseUnits(plan.realAmount, 6).toString(),
        })
        assert.deepEqual(flow.signedAmounts, ['10'])
        assert.equal(amounts.subtractDecimal(flow.signedAmounts[0], plan.mapping.flatFee, 6), plan.realAmount)
    })
}

test('Hyperliquid requires enough balance for the gross withdrawal before signing', async () => {
    const flow = createWithdrawal('Hyperliquid', undefined, { spot: '9.9', perps: '0' })
    await assert.rejects(flow.execute({ amount: 9.8, amountInBaseUnits: '9800000' }), { header: 'Insufficient balance' })
    assert.deepEqual(flow.events, ['preparing'])
})

test('BAB-410: equal available and withdrawal amounts explain the additional reserve', async () => {
    const flow = createWithdrawal('Hyperliquid', undefined, { spot: '5546.669466', perps: '0' })
    await assert.rejects(flow.execute({ amountInBaseUnits: '5546469466' }), {
        header: 'Insufficient balance',
        message: 'Your available Hyperliquid balance (5546.669466 USDC) is below the required 5546.679466 USDC: 5546.669466 USDC to withdraw (including a 0.2 USDC forwarding fee), plus a 0.01 USDC processing reserve. Shortfall: 0.01 USDC.',
    })
    assert.deepEqual(flow.events, ['preparing'])
    assert.deepEqual(flow.signedAmounts, [])
})

for (const [label, split, netAmount, expectedWithdrawal] of [
    ['incident amount plus reserve', { spot: '5546.679466', perps: '0' }, '5546.469466', '5546.669466'],
    ['floating-point addition boundary', { spot: '0.24', perps: '0' }, '0.03', '0.23'],
    ['held spot funds', { spot: '0.3', hold: '0.02', perps: '0' }, '0.07', '0.27'],
    ['perps balance', { spot: '0', perps: '0.28' }, '0.07', '0.27'],
    ['more than Number.MAX_SAFE_INTEGER base units', { spot: '9007199254.950993', perps: '0' }, '9007199254.740993', '9007199254.940993'],
]) {
    test(`Hyperliquid accepts exact coverage including fees and reserve: ${label}`, async () => {
        const flow = createWithdrawal('Hyperliquid', undefined, split)
        assert.equal(await flow.execute({ amountInBaseUnits: parseUnits(netAmount, 6).toString() }), '')
        assert.deepEqual(flow.signedAmounts, [expectedWithdrawal])
        assert.deepEqual(flow.signedTransfers, [])
        assert.deepEqual(flow.events, ['preparing', 'sign', 'submitting', 'submit'])
    })
}

for (const [available, netAmount, required] of [
    ['5546.679465', '5546.469466', '5546.679466'],
    ['9007199254.950992', '9007199254.740993', '9007199254.950993'],
]) {
    test(`Hyperliquid reports a one-base-unit shortfall below ${required}`, async () => {
        const flow = createWithdrawal('Hyperliquid', undefined, { spot: available, perps: '0' })
        await assert.rejects(flow.execute({ amountInBaseUnits: parseUnits(netAmount, 6).toString() }), error => {
            assert.equal(error.header, 'Insufficient balance')
            assert.ok(error.message.includes(`required ${required} USDC`))
            assert.ok(error.message.endsWith('Shortfall: 0.000001 USDC.'))
            return true
        })
        assert.deepEqual(flow.events, ['preparing'])
    })
}

for (const [spot, perps, sourceDex, toPerp, transfer] of [
    [200000n, 80000n, 'spot', false, '0.08'],
    [80000n, 200000n, '', true, '0.08'],
    [140000n, 140000n, 'spot', false, '0.14'],
]) {
    test(`Hyperliquid consolidates exact coverage from ${spot} spot + ${perps} perps units`, () => {
        assert.deepEqual(withdrawalPlanner.planWithdrawal({ spot, perps, combined: spot + perps }, 280000n, 6), {
            sourceDex, transfer: { toPerp, amount: transfer },
        })
        assert.deepEqual(withdrawalPlanner.planWithdrawal({ spot, perps, combined: spot + perps }, 280001n, 6), { insufficient: true })
    })
}

for (const target of ['spot', 'perps']) {
    test(`Hyperliquid polls until ${target} covers the exact requirement before signing`, async t => {
        const snapshots = [
            { spot: 200000n, perps: 80000n, combined: 280000n },
            { spot: 279999n, perps: 1n, combined: 280000n },
            { spot: 280000n, perps: 0n, combined: 280000n },
        ]
        let reads = 0
        t.mock.method(HyperliquidClient.prototype, 'getWithdrawableSplit', async (_user, _url, _coin, decimals) => {
            assert.equal(decimals, 6)
            const snapshot = snapshots[reads++] ?? assert.fail('unexpected extra balance read')
            return target === 'spot' ? snapshot : { ...snapshot, spot: snapshot.perps, perps: snapshot.spot }
        })
        t.mock.method(globalThis, 'setTimeout', callback => { queueMicrotask(callback); return 0 })
        const flow = createWithdrawal('Hyperliquid')
        assert.equal(await flow.execute({ amountInBaseUnits: '70000' }), '')
        assert.equal(reads, 3, 'one base unit below the requirement must keep polling')
        assert.equal(flow.signedTransfers.length, 1)
        assert.equal(flow.signedTransfers[0].amount, '0.08')
        assert.equal(flow.signedTransfers[0].toPerp, target === 'perps')
        assert.deepEqual(flow.signedAmounts, ['0.27'])
        assert.deepEqual(flow.events, ['preparing', 'consolidate', 'sign', 'submitting', 'submit'])
    })
}

for (const [total, hold, withdrawable, expected] of [
    ['0.3', '0.02', '0', { spot: 280000n, perps: 0n, combined: 280000n }],
    ['1.0000011', '0.0000009', '0.0000009', { spot: 1000000n, perps: 0n, combined: 1000000n }],
    ['1.0000009', '0.0000001', '0', { spot: 1000000n, perps: 0n, combined: 1000000n }],
    ['0.1', '0.2', '-1', { spot: 0n, perps: 0n, combined: 0n }],
    ['9007199254.950993', '0.000001', '0.000001', { spot: 9007199254950992n, perps: 1n, combined: 9007199254950993n }],
]) {
    test(`Hyperliquid preserves raw balance precision: total=${total}, hold=${hold}, perps=${withdrawable}`, async () => {
        const client = new HyperliquidClient()
        client.getSpotClearinghouseState = async () => ({ balances: [{ coin: 'usdc', total, hold }] })
        client.getClearinghouseState = async () => ({ withdrawable })
        assert.deepEqual(await client.getWithdrawableSplit('user', 'node', 'USDC', 6), expected)
    })
}

test('Hyperliquid treats an absent spot balance as zero', async () => {
    const client = new HyperliquidClient()
    client.getSpotClearinghouseState = async () => ({ balances: [] })
    client.getClearinghouseState = async () => ({ withdrawable: '1.21' })
    assert.deepEqual(await client.getWithdrawableSplit('user', 'node', 'USDC', 6), { spot: 0n, perps: 1210000n, combined: 1210000n })
})

test('Hyperliquid exposes the combined balance in token units to the widget', async t => {
    const reads = []
    t.mock.method(HyperliquidClient.prototype, 'getSpotClearinghouseState', async (...args) => {
        reads.push(args)
        return { balances: [{ coin: 'USDC', total: '0.3', hold: '0.02' }] }
    })
    t.mock.method(HyperliquidClient.prototype, 'getClearinghouseState', async (...args) => {
        reads.push(args)
        return { withdrawable: '0.72' }
    })
    const { HyperliquidBalanceProvider } = loadProvider('../src/additionalProviders/hyperliquid/hyperliquidBalanceProvider.ts', {
        '@layerswap/widget-types': { BalanceProvider: class {} },
        './constants': constants,
        './hyperliquidClient': { HyperliquidClient },
        viem: { formatUnits },
    })
    const balances = await new HyperliquidBalanceProvider().fetchBalance('user', {
        name: KnownInternalNames.Networks.HyperliquidMainnet,
        tokens: [{ symbol: 'USDC', decimals: 6 }],
    }, { timeoutMs: 5000, retryCount: 1 })
    assert.equal(balances.length, 1)
    assert.equal(balances[0].amount, 1)
    assert.equal(balances[0].decimals, 6)
    assert.equal(balances[0].token, 'USDC')
    assert.equal(reads.length, 2)
    for (const args of reads) assert.deepEqual(args.slice(2), [5000, 1])
})

for (const invalid of ['', 'NaN', 'Infinity', undefined]) {
    test(`Hyperliquid rejects an unreadable held balance: ${invalid}`, async () => {
        const client = new HyperliquidClient()
        client.getSpotClearinghouseState = async () => ({ balances: [{ coin: 'USDC', total: '1', hold: invalid }] })
        client.getClearinghouseState = async () => ({ withdrawable: '0' })
        await assert.rejects(client.getWithdrawableSplit('user', 'node', 'USDC', 6), /Unable to read your Hyperliquid balance/)
    })
}

for (const [response, refused] of [
    ['Insufficient balance', true],
    ['Insufficient spot balance', true],
    ['Nonce already used', false],
    ['Request expired', false],
    ['Internal error', false],
]) {
    test(`Hyperliquid reports whether a provider response proves non-submission: ${response}`, async () => {
        const flow = createWithdrawal('Hyperliquid', { status: 'err', response })
        await assert.rejects(flow.execute())
        assert.deepEqual(flow.events, [
            'preparing', 'sign', 'submitting', 'submit',
            ...(refused ? ['not_submitted'] : []),
        ])
    })
}

test('a transport error containing insufficient balance does not prove non-submission', async () => {
    const error = new Error('Insufficient balance')
    const flow = createWithdrawal('Hyperliquid', error)
    await assert.rejects(flow.execute(), caught => caught === error)
    assert.deepEqual(flow.events, ['preparing', 'sign', 'submitting', 'submit'])
})

for (const amountInBaseUnits of [undefined, '', '0', '-1', '1.5', '1e6']) {
    test(`Hyperliquid rejects an invalid backend amount before signing: ${JSON.stringify(amountInBaseUnits)}`, async () => {
        const flow = createWithdrawal('Hyperliquid')
        await assert.rejects(flow.execute({ amountInBaseUnits }), { header: 'Invalid amount' })
        assert.deepEqual(flow.events, ['preparing'])
    })
}

for (const provider of ['Hyperliquid', 'Polymarket']) {
    for (const failure of ['sign', 'submit', undefined]) {
        test(`${provider} distinguishes preparation from submission: ${failure ?? 'success'}`, async () => {
            const flow = createWithdrawal(provider, failure)
            if (failure) await assert.rejects(flow.execute(), error => error === flow.failed)
            else assert.equal(await flow.execute(), '')
            assert.deepEqual(flow.events, failure === 'sign'
                ? ['preparing', 'sign']
                : ['preparing', 'sign', 'submitting', 'submit'])
        })
    }
}
