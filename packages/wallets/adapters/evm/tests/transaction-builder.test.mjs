import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(path, imports) {
    const module = { exports: {} }
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    new Function('require', 'module', 'exports', outputText)(id => imports[id] ?? require(id), module, module.exports)
    return module.exports
}
const params = {
    amount: '0.000163036734120886', callData: '0x1234', depositAddress: '0x0000000000000000000000000000000000000002',
    selectedWallet: { address: '0x0000000000000000000000000000000000000001' }, network: { chain_id: '60808' }, token: {},
}

for (const affordable of [true, false]) test(`exact transaction fee budget: affordable=${affordable}`, async () => {
    let estimated
    const gas = 21140n, fees = { maxFeePerGas: 1000000000n, maxPriorityFeePerGas: 1n }, l1Fee = 474973262n
    const fee = gas * fees.maxFeePerGas + l1Fee
    const balance = affordable ? 1000000000000000n : 169158247102604n
    const { transactionBuilder } = load('../src/transferProvider/transactionBuilder.ts', {
        '../gasProviders/estimateTransferFee': { estimateTransferFee: async (network, request) => {
            estimated = request
            return { gas, fees, l1Fee, fee, client: { getBalance: async () => balance } }
        } },
    })
    if (affordable) {
        const tx = await transactionBuilder(params, {})
        assert.equal(tx.gas, gas) // gas units, never native-token fee
        assert.equal(tx.maxFeePerGas, fees.maxFeePerGas)
        assert.equal(tx.maxPriorityFeePerGas, fees.maxPriorityFeePerGas)
    } else {
        await assert.rejects(transactionBuilder(params, {}), error => {
            assert.equal(error.code, 'INSUFFICIENT_FUNDS')
            assert.equal(JSON.parse(error.cause.details).feeWei, '21140474973262')
            return true
        })
    }
    assert.equal(estimated.value, 163036734120886n)
    assert.equal(estimated.data, params.callData)
    assert.equal(estimated.account, params.selectedWallet.address)
    assert.equal(estimated.to, params.depositAddress)
})

for (const legacy of [true, false]) test(`fee estimation preserves units and L1 calldata (legacy=${legacy})`, async () => {
    const request = { account: params.selectedWallet.address, to: params.depositAddress, value: 123n, data: '0x1234' }
    let l1Request, executionRequest
    const client = {
        estimateGas: async tx => { executionRequest = tx; return 23000n },
        getBlock: async ({ blockTag }) => { assert.equal(blockTag, 'latest'); return { baseFeePerGas: legacy ? null : 20n } },
        estimateFeesPerGas: async () => ({ maxFeePerGas: 100n, maxPriorityFeePerGas: 1n }),
        getGasPrice: async () => 50n,
        extend: () => ({ estimateL1Fee: async tx => { l1Request = tx; return 12345n } }),
    }
    const { estimateTransferFee } = load('../src/gasProviders/estimateTransferFee.ts', {
        viem: { createPublicClient: () => client },
        'viem/op-stack': { publicActionsL2: () => ({}) },
        '../evmUtils/resolveChain': { default: () => ({}) },
        '../evmUtils/resolveTransports': { resolveFallbackTransport: () => ({}) },
        '../NetworkSettings': { default: { KnownSettings: {} } },
    })
    const result = await estimateTransferFee({ name: 'BOB', metadata: { evm_oracle_contract: '0xoracle' } }, request)
    assert.equal(result.gas, 23000n)
    assert.equal(result.fee, 23000n * (legacy ? 50n : 100n) + 12345n)
    assert.deepEqual(executionRequest, { ...request, ...(legacy ? { gasPrice: 50n } : { maxFeePerGas: 100n, maxPriorityFeePerGas: 1n }), stateOverride: [{ address: request.account, balance: request.value + (legacy ? 50n : 100n) * 60_000_000n + 1n }] })
    assert.deepEqual(l1Request, { ...request, chain: undefined, gasPriceOracleAddress: '0xoracle' })
})

for (const contract of [undefined, '0x0000000000000000000000000000000000000003']) for (const amount of [undefined, 0, 5435]) test(`Max fee probe is independent of typed amount: contract=${!!contract}, amount=${amount}`, async () => {
    let request
    const token = { symbol: contract ? 'USDT' : 'ETH', decimals: contract ? 6 : 18, contract }
    const native = { symbol: 'ETH', decimals: 18 }
    const { EVMGasProvider } = load('../src/gasProviders/evmGasProvider.ts', {
        './estimateTransferFee': { estimateTransferFee: async (_, tx) => { request = tx; return { fee: 21140474973262n } } },
        '../NetworkSettings': { default: { KnownSettings: {} } },
    })
    const result = await new EVMGasProvider().getGas({
        address: params.selectedWallet.address,
        recipientAddress: params.depositAddress,
        network: { chain_id: '60808', name: 'BOB', token: native }, token, amount,
    })
    assert.equal(result.gas, 0.000021140474973262)
    assert.equal(result.token, native)
    assert.equal(request.value, 0n) // a full native-balance probe must still estimate
    assert.equal(request.to, contract || params.depositAddress)
    assert.ok(request.data.endsWith('ff'.repeat(32)))
    if (contract) {
        const { decodeFunctionData, erc20Abi } = require('viem')
        const decoded = decodeFunctionData({ abi: erc20Abi, data: request.data.slice(0, -64) })
        assert.deepEqual(decoded.args, [params.depositAddress, 1000n])
    }
})

for (const fail of [true, false]) test(`wallet receives the estimated fields and failures retain fee diagnostics: fail=${fail}`, async () => {
    const tx = { chainId: 1, account: params.selectedWallet.address, to: params.depositAddress, value: 1n, data: '0x12', gas: 23000n, maxFeePerGas: 100n, maxPriorityFeePerGas: 1n }
    const phases = []
    let resolutions = 0
    const original = Object.assign(new Error('HTTP 429'), { code: 4200 })
    const connector = { getProvider: async () => ({ request: async () => { if (fail) throw original; return 'hash' } }) }
    const { createEVMTransferProvider } = load('../src/transferProvider/createEVMTransferProvider.ts', {
        '@wagmi/core': { sendTransaction: async (_, request) => {
            assert.equal(request.connector, connector, 'wagmi receives the original connector without interception')
            const { connector: tracked, ...sent } = request
            assert.deepEqual(sent, tx)
            return (await tracked.getProvider()).request({ method: 'eth_sendTransaction' })
        } },
        './toTransferError': { toTransferError: error => new Error(error.message, { cause: error }) },
        '../service/resolveWalletConnector': { resolveWalletConnector: () => { resolutions++; return connector } },
    })
    const transfer = createEVMTransferProvider({}, () => true, async (_, selected) => { assert.equal(selected, connector); return tx }).executeTransfer({
        ...params, onSubmissionStateChange: phase => phases.push(phase),
    })
    if (fail) await assert.rejects(transfer, error => {
        assert.equal(error.cause.cause, original)
        assert.equal(JSON.parse(error.cause.details).gasUnits, '23000')
        return true
    })
    else assert.equal(await transfer, 'hash')
    assert.deepEqual(phases, ['preparing', 'submitting'])
    assert.equal(resolutions, 1)
})

test('direct transaction intent does not depend on application RPC availability', async () => {
    const { transactionBuilder } = load('../src/transferProvider/transactionBuilder.ts', {
        '../gasProviders/estimateTransferFee': { estimateTransferFee: () => assert.fail('No application fee RPC is required to build intent') },
    })
    const tx = await transactionBuilder(params)
    assert.equal(tx.value, 163036734120886n)
    assert.equal(tx.gas, undefined)
})

test('final estimation uses the supplied chain-bound read client and requires no pending block support', async () => {
    const calls = []
    const walletClient = {
        getBlock: async ({ blockTag }) => { assert.equal(blockTag, 'latest'); calls.push('block'); return { baseFeePerGas: 20n } },
        estimateFeesPerGas: async () => ({ maxFeePerGas: 100n, maxPriorityFeePerGas: 1n }),
        estimateGas: async () => 21140n,
    }
    const { estimateTransferFee } = load('../src/gasProviders/estimateTransferFee.ts', {
        viem: { createPublicClient: () => assert.fail('The wallet RPC must replace the application transport') },
        'viem/op-stack': { publicActionsL2: () => ({}) },
        '../evmUtils/resolveChain': { default: () => assert.fail('Wallet client already has its chain') },
        '../evmUtils/resolveTransports': { resolveFallbackTransport: () => assert.fail('No application transport') },
        '../NetworkSettings': { default: { KnownSettings: {} } },
    })
    const result = await estimateTransferFee({ name: 'Ethereum' }, {
        account: params.selectedWallet.address, to: params.depositAddress, data: '0x', value: 1n,
    }, walletClient)
    assert.equal(result.client, walletClient)
    assert.equal(result.fee, 2114000n)
    assert.deepEqual(calls, ['block'])
})

for (const failure of [undefined, 'network_error', 'timeout', 'unsupported_method', 'insufficient_funds']) for (const walletChain of [60808, 1]) test(`bundled transfer reads requested chain, with checked wallet fallback: failure=${failure}, walletChain=${walletChain}`, async () => {
    const nodes = ['https://chain-rpc.invalid']
    const request = { ...params, network: { ...params.network, nodes } }
    const readClient = { source: 'chain-rpc' }
    const config = {}
    let builds = 0, walletReads = 0
    const original = new Error(failure ?? 'unused')
    const walletClient = { source: 'wallet-rpc' }
    const connector = { getProvider: async () => ({ request: async ({ method }) => { assert.equal(method, 'eth_chainId'); walletReads++; return `0x${walletChain.toString(16)}` } }) }
    const { createEvmTransfer } = load('../src/transferProvider/createEvmTransfer.ts', {
        viem: {
            createPublicClient: ({ chain, transport }) => {
                assert.equal(chain.id, 60808); return transport === nodes ? readClient : walletClient
            },
            custom: provider => provider,
        },
        '@layerswap/wallet-core/errors': { normalizeWalletErrorCode: error => { assert.equal(error, original); return failure } },
        '../evmUtils/resolveChain': { default: network => { assert.equal(network, request.network); return { id: 60808 } } },
        '../evmUtils/resolveTransports': { resolveFallbackTransport: actual => { assert.equal(actual, nodes); return actual } },
        '@layerswap/widget-types': { NetworkType: { EVM: 'evm' } },
        '../service/getEvmConfig': { getEvmConfig: () => config },
        './createEVMTransferProvider': { createEVMTransferProvider: (actual, _, build) => {
            assert.equal(actual, config); return { executeTransfer: props => build(props, connector) }
        } },
        './transactionBuilder': { transactionBuilder: async (props, client) => {
            assert.deepEqual({ ...props, onFeeEstimate: undefined }, { ...request, onFeeEstimate: undefined }); builds++;
            if (!client) return 'hash'
            if (client === readClient && failure) throw original
            assert.equal(client, failure ? walletClient : readClient); return 'hash'
        } },
    })
    const fallback = failure && failure !== 'insufficient_funds'
    if (failure && !fallback) await assert.rejects(createEvmTransfer().executeTransfer(request), error => error === original)
    else assert.equal(await createEvmTransfer().executeTransfer(request), 'hash')
    assert.equal(builds, fallback ? 2 : 1)
    assert.equal(walletReads, fallback ? 1 : 0)
})

test('actual contract fee is exposed before rejecting an unaffordable EOA-based Max', async () => {
    const native = { symbol: 'ETH', decimals: 18 }
    const balance = 1000000000000000n
    const actualGas = 120000n, actualFee = actualGas * 1000000000n
    const reviewed = { ...params, network: { ...params.network, token: native }, amount: '0.000974296' }
    let fee
    const { transactionBuilder } = load('../src/transferProvider/transactionBuilder.ts', {
        '../gasProviders/estimateTransferFee': { estimateTransferFee: async (_, tx) => {
            assert.equal(tx.to, reviewed.depositAddress)
            return { gas: actualGas, fees: { gasPrice: 1000000000n }, l1Fee: 0n, fee: actualFee, client: { getBalance: async () => balance } }
        } },
    })
    await assert.rejects(transactionBuilder({ ...reviewed, onFeeEstimate: value => { fee = value } }, {}), error => error.code === 'INSUFFICIENT_FUNDS')
    assert.deepEqual(fee, { gas: 0.00012, token: native })
    const adjusted = '0.0008776' // balance minus this fee and the existing 2% reserve
    const tx = await transactionBuilder({ ...reviewed, amount: adjusted }, {})
    assert.equal(tx.value, 877600000000000n)
    assert.equal(tx.gas, actualGas)
})

for (const outcome of ['affordable', 'exact-balance', 'insufficient', 'balance-error']) test(`fee adjustment is reported only for failed affordability: ${outcome}`, async () => {
    const native = { symbol: 'ETH', decimals: 18 }
    const fee = 120000000000000n
    const value = 163036734120886n
    const balance = value + fee + (outcome === 'insufficient' ? -1n : outcome === 'affordable' ? 1n : 0n)
    const readFailure = new Error('Balance RPC unavailable')
    const events = []
    let reported
    const { transactionBuilder } = load('../src/transferProvider/transactionBuilder.ts', {
        '../gasProviders/estimateTransferFee': { estimateTransferFee: async () => ({
            gas: 120000n, fees: { gasPrice: 1000000000n }, l1Fee: 0n, fee,
            client: { getBalance: async () => {
                events.push('balance')
                if (outcome === 'balance-error') throw readFailure
                return balance
            } },
        }) },
    })
    const result = transactionBuilder({ ...params, network: { ...params.network, token: native },
        onFeeEstimate: estimate => { events.push('adjustment'); reported = estimate },
    }, {})
    if (outcome === 'insufficient') {
        await assert.rejects(result, error => error.code === 'INSUFFICIENT_FUNDS')
        assert.deepEqual(reported, { gas: 0.00012, token: native })
        assert.deepEqual(events, ['balance', 'adjustment'])
    } else {
        if (outcome === 'balance-error') await assert.rejects(result, error => error === readFailure)
        else {
            const tx = await result
            assert.equal(tx.value, value)
            assert.equal(tx.gas, 120000n)
            assert.equal(tx.gasPrice, 1000000000n)
        }
        assert.equal(reported, undefined)
        assert.deepEqual(events, ['balance'])
    }
})

for (const legacy of [true, false]) test(`real fee helper exposes contract adjustment despite RPC affordability cap: legacy=${legacy}`, async () => {
    const native = { symbol: 'ETH', decimals: 18 }
    const balance = 1000000000000000n
    let reported
    const { estimateTransferFee } = load('../src/gasProviders/estimateTransferFee.ts', {
        '../evmUtils/resolveChain': {}, '../evmUtils/resolveTransports': {},
        '../NetworkSettings': { default: { KnownSettings: {} } },
    })
    const client = {
        getBlock: async () => ({ baseFeePerGas: legacy ? null : 1n }),
        getGasPrice: async () => 1000000000n,
        estimateFeesPerGas: async () => ({ maxFeePerGas: 1000000000n, maxPriorityFeePerGas: 1n }),
        estimateGas: async tx => {
            assert.equal(tx.value, 974296000000000n, 'preserve payable contract execution')
            assert.equal(tx.data, params.callData)
            const cap = tx.maxFeePerGas ?? tx.gasPrice ?? 1000000000n
            assert.ok(cap > 0n)
            const simulatedBalance = tx.stateOverride?.[0].balance ?? balance
            if (cap && (simulatedBalance - tx.value) / cap < 100000n) throw new Error('gas required exceeds allowance')
            return 100000n
        },
        getBalance: async () => balance,
    }
    const { transactionBuilder } = load('../src/transferProvider/transactionBuilder.ts', {
        '../gasProviders/estimateTransferFee': { estimateTransferFee },
    })
    await assert.rejects(transactionBuilder({ ...params, amount: '0.000974296', network: { ...params.network, token: native },
        onFeeEstimate: fee => { reported = fee },
    }, client), error => error.code === 'INSUFFICIENT_FUNDS')
    assert.deepEqual(reported, { gas: 0.0001, token: native })
})

for (const walletFailure of ['unsupported_method', 'network_error', 'insufficient_funds', 'contract_reverted']) test(`wallet read fallback preserves semantic failures: ${walletFailure}`, async () => {
    const { createEvmTransfer } = load('../src/transferProvider/createEvmTransfer.ts', {
        viem: { createPublicClient: ({ transport }) => transport, custom: () => 'wallet' },
        '@layerswap/wallet-core/errors': { normalizeWalletErrorCode: error => error.message },
        '../evmUtils/resolveChain': { default: () => ({ id: 60808 }) },
        '../evmUtils/resolveTransports': { resolveFallbackTransport: (_, options) => {
            assert.deepEqual(options, { retryCount: 0, timeoutMs: 1500 }); return 'app'
        } },
        '../service/getEvmConfig': { getEvmConfig: () => ({}) },
        './createEVMTransferProvider': { createEVMTransferProvider: (_, __, build) => ({ executeTransfer: props => build(props, {
            getProvider: async () => ({ request: async () => '0xed88' }),
        }) }) },
        './transactionBuilder': { transactionBuilder: async (_, client) => {
            if (client === 'app') throw new Error('network_error')
            if (client === 'wallet') throw new Error(walletFailure)
            return 'wallet-prepared-intent'
        } },
    })
    const result = createEvmTransfer().executeTransfer(params)
    if (['insufficient_funds', 'contract_reverted'].includes(walletFailure)) await assert.rejects(result, { message: walletFailure })
    else assert.equal(await result, 'wallet-prepared-intent')
})

test('hung read phases expire and late fee estimates cannot update the active attempt', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const late = []
    let adjustments = 0
    const { createEvmTransfer } = load('../src/transferProvider/createEvmTransfer.ts', {
        viem: { createPublicClient: ({ transport }) => transport, custom: () => 'wallet' },
        '@layerswap/wallet-core/errors': { normalizeWalletErrorCode: error => error.name === 'TimeoutError' ? 'timeout' : 'unknown_error' },
        '../evmUtils/resolveChain': { default: () => ({ id: 60808 }) },
        '../evmUtils/resolveTransports': { resolveFallbackTransport: () => 'app' },
        '../service/getEvmConfig': { getEvmConfig: () => ({}) },
        './createEVMTransferProvider': { createEVMTransferProvider: (_, __, build) => ({ executeTransfer: props => build(props, {
            getProvider: async () => ({ request: async () => '0xed88' }),
        }) }) },
        './transactionBuilder': { transactionBuilder: async (props, client) => {
            if (!client) return 'wallet-prepared-intent'
            return new Promise(resolve => late.push(() => { props.onFeeEstimate({ gas: 1 }); resolve('stale') }))
        } },
    })
    const result = createEvmTransfer().executeTransfer({ ...params, onFeeEstimate: () => { adjustments++ } })
    t.mock.timers.tick(5000)
    for (let i = 0; i < 20; i++) await Promise.resolve()
    assert.equal(late.length, 2)
    t.mock.timers.tick(5000)
    assert.equal(await result, 'wallet-prepared-intent')
    late.forEach(resolve => resolve())
    assert.equal(adjustments, 0)
})

test('Max probe can price gas when the account cannot afford one fee', async () => {
    const native = { symbol: 'ETH', decimals: 18 }
    const { estimateTransferFee } = load('../src/gasProviders/estimateTransferFee.ts', {
        '../evmUtils/resolveChain': { default: () => ({}) },
        '../evmUtils/resolveTransports': { resolveFallbackTransport: () => ({}) },
        '../NetworkSettings': { default: { KnownSettings: {} } },
        viem: { createPublicClient: () => ({
            getBlock: async () => ({ baseFeePerGas: null }),
            getGasPrice: async () => 1000000000n,
            estimateGas: async tx => {
                assert.equal(tx.value, 0n)
                const balance = 1n
                const feeCap = tx.gasPrice ?? tx.maxFeePerGas ?? 1000000000n
                assert.ok(feeCap > 0n)
                const simulatedBalance = tx.stateOverride?.[0].balance ?? balance
                if (feeCap && simulatedBalance / feeCap < 21512n) throw new Error('gas required exceeds allowance')
                return 21512n
            },
        }) },
    })
    const { EVMGasProvider } = load('../src/gasProviders/evmGasProvider.ts', {
        './estimateTransferFee': { estimateTransferFee },
        '../NetworkSettings': { default: { KnownSettings: {} } },
    })
    const fee = await new EVMGasProvider().getGas({ address: params.selectedWallet.address,
        network: { chain_id: '1', name: 'ETHEREUM_MAINNET', token: native }, token: native,
    })
    assert.equal(fee.gas, 0.000021512)
})

for (const message of ['state overrides are not supported', 'too many arguments, want at most 2']) test(`unsupported overrides retry real fees safely: ${message}`, async () => {
    const requests = []
    const original = new Error('execution reverted: state overrides are not supported')
    let revert = false
    const { estimateTransferFee } = load('../src/gasProviders/estimateTransferFee.ts', {
        '../NetworkSettings': { default: { KnownSettings: {} } },
        '../evmUtils/resolveChain': {}, '../evmUtils/resolveTransports': {},
    })
    const client = {
        getBlock: async () => ({ baseFeePerGas: null }), getGasPrice: async () => 100n,
        estimateGas: async tx => {
            requests.push(tx)
            assert.equal(tx.gasPrice, 100n)
            assert.equal(tx.value, 123n)
            if (revert) throw original
            if (tx.stateOverride) throw new Error(message)
            return 21000n
        },
    }
    const request = { account: params.selectedWallet.address, to: params.depositAddress, value: 123n, data: '0x1234' }
    assert.equal((await estimateTransferFee({ name: 'test' }, request, client)).gas, 21000n)
    assert.equal(requests.length, 2)
    assert.equal(requests[1].stateOverride, undefined)
    revert = true
    await assert.rejects(estimateTransferFee({ name: 'test' }, request, client), error => error === original)
    assert.equal(requests.length, 3, 'ordinary reverts are never retried without overrides')
})

test('unsupported override never converts an unaffordable request to a zero-fee estimate', async () => {
    let calls = 0
    const insufficient = Object.assign(new Error('gas required exceeds allowance (20000)'), { code: -32000 })
    const { estimateTransferFee } = load('../src/gasProviders/estimateTransferFee.ts', {
        '../NetworkSettings': { default: { KnownSettings: {} } },
        '../evmUtils/resolveChain': {}, '../evmUtils/resolveTransports': {},
    })
    await assert.rejects(estimateTransferFee({ name: 'test' }, {
        account: params.selectedWallet.address, to: params.depositAddress, value: 123n, data: '0x1234',
    }, {
        getBlock: async () => ({ baseFeePerGas: null }), getGasPrice: async () => 100n,
        estimateGas: async tx => {
            calls++
            assert.equal(tx.gasPrice, 100n)
            if (tx.stateOverride) throw new Error('state overrides are not supported')
            throw insufficient
        },
    }), error => error === insufficient)
    assert.equal(calls, 2)
})

for (const stage of ['provider', 'chainId', 'estimate']) for (const [label, failure, optionalFallback] of [
    ['unknown', new Error('Probe unavailable without a classified code'), true],
    ['internal RPC', Object.assign(new Error('Internal error'), { code: -32603 }), true],
    ['network', Object.assign(new Error('Network failure'), { code: 'NETWORK_ERROR' }), true],
    ['unsupported', Object.assign(new Error('Method unavailable'), { code: -32601 }), true],
    ['rejected', Object.assign(new Error('User rejected'), { code: 4001 }), false],
    ['unauthorized', Object.assign(new Error('Unauthorized'), { code: 4100 }), false],
    ['disconnected', Object.assign(new Error('Disconnected'), { code: 4900 }), false],
    ['pending', Object.assign(new Error('Already pending'), { code: -32002 }), false],
    ['invalid parameters', Object.assign(new Error('Invalid params'), { code: -32602 }), false],
    ['insufficient funds', Object.assign(new Error('Insufficient funds'), { code: 'INSUFFICIENT_FUNDS' }), false],
    ['revert', Object.assign(new Error('Execution reverted'), { code: 'CALL_EXCEPTION' }), false],
]) test(`optional probes retain actionable errors separately from estimation: ${stage}, ${label}`, async () => {
    let unpricedBuilds = 0, walletEstimates = 0
    const { createEvmTransfer } = load('../src/transferProvider/createEvmTransfer.ts', {
        viem: { createPublicClient: ({ transport }) => transport, custom: () => 'wallet' },
        '../evmUtils/resolveChain': { default: () => ({ id: 60808 }) },
        '../evmUtils/resolveTransports': { resolveFallbackTransport: () => 'app' },
        '../service/getEvmConfig': { getEvmConfig: () => ({}) },
        './createEVMTransferProvider': { createEVMTransferProvider: (_, __, build) => ({ executeTransfer: props => build(props, {
            getProvider: async () => {
                if (stage === 'provider') throw failure
                return { request: async ({ method }) => {
                    assert.equal(method, 'eth_chainId')
                    if (stage === 'chainId') throw failure
                    return '0xed88'
                } }
            },
        }) }) },
        './transactionBuilder': { transactionBuilder: async (_, client) => {
            if (client === 'app') throw Object.assign(new Error('App RPC unavailable'), { code: 'NETWORK_ERROR' })
            if (client === 'wallet') { walletEstimates++; throw failure }
            unpricedBuilds++
            return { chainId: 60808, intent: true }
        } },
    })
    const fallback = optionalFallback && (stage !== 'estimate' || label === 'network' || label === 'unsupported')
    const result = createEvmTransfer().executeTransfer(params)
    if (fallback) assert.deepEqual(await result, { chainId: 60808, intent: true })
    else await assert.rejects(result, error => error === failure)
    assert.equal(unpricedBuilds, fallback ? 1 : 0)
    assert.equal(walletEstimates, stage === 'estimate' ? 1 : 0)
})
