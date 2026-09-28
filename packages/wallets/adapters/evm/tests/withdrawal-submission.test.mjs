import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { formatUnits } from 'viem'

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

function createWithdrawal(providerName, failure) {
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
            viem: { formatUnits },
            '../../service/getEvmConfig': { getEvmConfig: () => ({}) },
            './hyperliquidClient': { HyperliquidClient: class {
                getWithdrawableSplit = async () => ({ spot: 10, perps: 0, combined: 10 })
                withdraw = submit
            } },
            './withdraw': { signSendToEvm: sign },
            './planWithdrawal': { planWithdrawal: () => ({ sourceDex: 'spot' }) },
            './constants': { resolveHyperliquidConfig: () => ({}), HYPERLIQUID_WITHDRAW_HEADROOM: 0 },
            './resolveError': { resolveHyperliquidError: () => assert.fail('not a provider refusal') },
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
            './relayerClient': { getRelayerNonce: async () => '1', isPolymarketDeployed: async () => true, submitRelayerTransaction: submit },
            './constants': { resolvePolymarketConfig: () => ({}), POLYMARKET_USDC_E_ADDRESS: 'usdc' },
            './resolveError': { resolvePolymarketError: () => assert.fail('not a provider refusal') },
        })
        provider = createPolymarketTransferProvider({}, () => true)
    }
    return {
        events, failed, signedAmounts,
        execute: (params = {}) => provider.executeTransfer({
            network: {}, token: { decimals: 6 }, amount: 1, amountInBaseUnits: '1000000',
            sourceAddress: 'source', depositAddress: 'deposit', callData: '0x12345678',
            ...params,
            onSubmissionStateChange: phase => events.push(phase),
        }),
    }
}

for (const [baseUnits, decimals, expected] of [
    ['1234567', 6, '1.234567'],
    ['1', 6, '0.000001'],
    ['9007199254740993', 6, '9007199254.740993'],
    ['1234567890123456789', 18, '1.234567890123456789'],
]) {
    test(`Hyperliquid signs the exact backend amount: ${baseUnits} with ${decimals} decimals`, async () => {
        const flow = createWithdrawal('Hyperliquid')
        await flow.execute({ amount: 99, amountInBaseUnits: baseUnits, token: { decimals } })
        assert.deepEqual(flow.signedAmounts, [expected])
    })
}

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
