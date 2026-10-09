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

function createWithdrawal(providerName, failure, split = { spot: 100_000_000_000, perps: 0, combined: 100_000_000_000 }, relayer = {}) {
    const events = []
    const signedAmounts = []
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
            './hyperliquidClient': { HyperliquidClient: class {
                getWithdrawableSplit = async () => split
                withdraw = submit
            } },
            './withdraw': { signSendToEvm: sign },
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
        events, failed, signedAmounts,
        execute: (params = {}) => provider.executeTransfer({
            network: { name: KnownInternalNames.Networks.HyperliquidMainnet },
            token: { decimals: 6 }, amount: 1, amountInBaseUnits: '1000000',
            sourceAddress: 'source', depositAddress: 'deposit', callData: '0x12345678',
            ...params,
            onSubmissionStateChange: phase => {
                events.push(phase)
                params.onSubmissionStateChange?.(phase)
            },
        }),
    }
}

function createProviderExecution() {
    const saved = new Map()
    const storage = {
        getItem: key => saved.get(key) ?? null,
        setItem: (key, value) => saved.set(key, value),
        removeItem: key => saved.delete(key),
    }
    const statuses = { Pending: 'pending', Failed: 'failed' }
    const { useSwapTransactionStore: store } = loadProvider('../../../../widget/core/src/stores/swapTransactionStore.tsx', {
        zustand: { create },
        'zustand/middleware': { persist, createJSONStorage: () => createJSONStorage(() => storage) },
        '../lib/apiClients/layerSwapApiClient': { BackendTransactionStatus: statuses },
    })
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
        '@/stores/atomicBatchStore': { getAtomicBatch: () => undefined },
        '@/stores/swapTransactionStore': { useSwapTransactionStore: store },
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
        const execution = createProviderExecution()
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
        const execution = createProviderExecution()
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
    const flow = createWithdrawal('Hyperliquid', undefined, { spot: 9.9, perps: 0, combined: 9.9 })
    await assert.rejects(flow.execute({ amount: 9.8, amountInBaseUnits: '9800000' }), { header: 'Insufficient balance' })
    assert.deepEqual(flow.events, ['preparing'])
})

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
