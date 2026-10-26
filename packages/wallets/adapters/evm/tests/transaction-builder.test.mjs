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

for (const fail of [true, false]) test(`custom builders retain their fields and failures retain diagnostics: fail=${fail}`, async () => {
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


function bundledTransfer(send, recover = () => assert.fail('Unexpected recovery')) {
    const { transactionBuilder } = load('../src/transferProvider/transactionBuilder.ts', {})
    const { toTransferError } = load('../src/transferProvider/toTransferError.ts', {})
    const { createEVMTransferProvider } = load('../src/transferProvider/createEVMTransferProvider.ts', {
        '@wagmi/core': { sendTransaction: send },
        './toTransferError': { toTransferError },
        '../service/resolveWalletConnector': { resolveWalletConnector: () => ({ id: 'selected' }) },
    })
    return load('../src/transferProvider/createEvmTransfer.ts', {
        '../service/getEvmConfig': { getEvmConfig: () => ({}) },
        './createEVMTransferProvider': { createEVMTransferProvider },
        './transactionBuilder': { transactionBuilder },
        './recoverTransferFee': { recoverTransferFee: recover },
    }).createEvmTransfer()
}
const nativeParams = { ...params, network: { ...params.network, token: { symbol: 'ETH', decimals: 18 } } }

test('bundled sends hand only intent to the wallet without application fee or balance reads', async () => {
    const phases = []
    const transfer = bundledTransfer(async (_, tx) => {
        assert.deepEqual(tx, { chainId: 60808, account: params.selectedWallet.address,
            to: params.depositAddress, value: 163036734120886n, data: params.callData, connector: { id: 'selected' } })
        return 'wallet-hash'
    })
    assert.equal(await transfer.executeTransfer({ ...nativeParams, onFeeEstimate: () => assert.fail('No recovery on success'),
        onSubmissionStateChange: phase => phases.push(phase),
    }), 'wallet-hash')
    assert.deepEqual(phases, ['preparing', 'submitting'])
})

for (const [label, error, contract, callback, shouldRecover] of [
    ['native insufficient funds', Object.assign(new Error('Insufficient funds'), { code: 'INSUFFICIENT_FUNDS' }), undefined, true, true],
    ['ERC20 insufficient funds', Object.assign(new Error('Insufficient funds'), { code: 'INSUFFICIENT_FUNDS' }), '0xtoken', true, false],
    ['no callback', Object.assign(new Error('Insufficient funds'), { code: 'INSUFFICIENT_FUNDS' }), undefined, false, false],
    ['rejection', Object.assign(new Error('User rejected'), { code: 4001 }), undefined, true, false],
    ['revert', Object.assign(new Error('Execution reverted'), { code: 'CALL_EXCEPTION' }), undefined, true, false],
    ['RPC outage', Object.assign(new Error('Network unavailable'), { code: 'NETWORK_ERROR' }), undefined, true, false],
]) test(`wallet error recovery is nonblocking and specific: ${label}`, async () => {
    let sends = 0, recoveries = 0
    const transfer = bundledTransfer(async () => { sends++; throw error }, () => {
        recoveries++
        return new Promise(() => {}) // must not delay returning the wallet error
    })
    await assert.rejects(transfer.executeTransfer({ ...nativeParams, token: { contract },
        onFeeEstimate: callback ? () => {} : undefined,
    }), failure => {
        assert.equal(failure.cause.cause, error, 'preserve the original wallet failure')
        return true
    })
    assert.equal(sends, 1)
    assert.equal(recoveries, shouldRecover ? 1 : 0)
})

test('another send invalidates the previous wallet failure recovery', async () => {
    let isCurrent, sends = 0
    const transfer = bundledTransfer(async () => {
        if (++sends === 1) throw Object.assign(new Error('Insufficient funds'), { code: 'INSUFFICIENT_FUNDS' })
        return 'second-hash'
    }, (_, check) => { isCurrent = check })
    await assert.rejects(transfer.executeTransfer({ ...nativeParams, onFeeEstimate: () => {} }))
    assert.equal(isCurrent(), true)
    assert.equal(await transfer.executeTransfer(nativeParams), 'second-hash')
    assert.equal(isCurrent(), false)
    assert.equal(sends, 2)
})

function recoveryWithEstimate(estimate) {
    return load('../src/transferProvider/recoverTransferFee.ts', {
        viem: { ...require('viem'), createPublicClient: () => ({}) },
        '../evmUtils/resolveChain': { default: network => { assert.equal(network.chain_id, '60808'); return {} } },
        '../evmUtils/resolveTransports': { resolveFallbackTransport: (_, options) => {
            assert.deepEqual(options, { retryCount: 0, timeoutMs: 1500 }); return {}
        } },
        '../gasProviders/estimateTransferFee': { estimateTransferFee: estimate },
        './transactionBuilder': load('../src/transferProvider/transactionBuilder.ts', {}),
    }).recoverTransferFee
}

test('wallet fee recovery estimates the actual target without changing the amount', async () => {
    let received
    const recover = recoveryWithEstimate(async (_, tx) => {
        assert.equal(tx.to, params.depositAddress)
        assert.equal(tx.value, 163036734120886n)
        assert.equal(tx.data, params.callData)
        return { fee: 120000000000000n }
    })
    await recover({ ...nativeParams, onFeeEstimate: fee => { received = fee } }, () => true)
    assert.deepEqual(received, { gas: 0.00012, token: nativeParams.network.token })
})

for (const result of ['timeout', 'stale', 'RPC failure']) test(`recovery leaves the wallet error unchanged when ${result}`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    let resolveEstimate
    const recover = recoveryWithEstimate(async () => {
        if (result === 'RPC failure') throw new Error('RPC unavailable')
        return new Promise(resolve => { resolveEstimate = resolve })
    })
    const task = recover({ ...nativeParams, onFeeEstimate: () => assert.fail('Do not publish unusable estimates') }, () => result !== 'stale')
    for (let i = 0; i < 5; i++) await Promise.resolve()
    if (result === 'timeout') t.mock.timers.tick(5000)
    resolveEstimate?.({ fee: 120000000000000n })
    await task
})
