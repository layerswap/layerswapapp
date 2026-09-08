import assert from 'node:assert/strict'
import test from 'node:test'

import {
    applyGasLimitMargin,
    buildTransactionGasParameters,
    calculateGasFeeAmounts,
    isEIP7702DelegatedCode,
    resolveAccountBalanceReserve,
} from '../dist/esm/gasProviders/evmGasMath.js'
import {
    createFullGasLimitEIP1559Policy,
    resolveEVMGasPolicy,
} from '../dist/esm/gasProviders/evmGasPolicies.js'

const monadPolicy = resolveEVMGasPolicy(143)
const defaultPolicy = resolveEVMGasPolicy(1)

test('applies Monad\'s 7.5% gas-limit margin with ceiling division', () => {
    assert.equal(applyGasLimitMargin(22_515n, monadPolicy), 24_204n)
    assert.equal(applyGasLimitMargin(22_515n, defaultPolicy), 22_515n)
})

test('separates Monad expected and maximum fees', () => {
    const result = calculateGasFeeAmounts({
        policy: monadPolicy,
        estimatedGas: 22_515n,
        gasPrice: 102_000_000_000n,
        maxFeePerGas: 122_000_000_000n,
    })

    assert.deepEqual(result, {
        gasLimit: 24_204n,
        estimatedFee: 2_468_808_000_000_000n,
        maximumFee: 2_952_888_000_000_000n,
    })
})

test('preserves the maximum-fee quote on non-Monad EVM chains', () => {
    assert.deepEqual(calculateGasFeeAmounts({
        policy: defaultPolicy,
        estimatedGas: 21_000n,
        gasPrice: 30_000_000_000n,
        maxFeePerGas: 40_000_000_000n,
    }), {
        gasLimit: 21_000n,
        estimatedFee: 840_000_000_000_000n,
        maximumFee: 840_000_000_000_000n,
    })
})

test('builds policy-controlled transaction parameters in gas units', () => {
    assert.deepEqual(buildTransactionGasParameters({
        policy: monadPolicy,
        estimatedGas: 22_515n,
        maxFeePerGas: 122_000_000_000n,
        maxPriorityFeePerGas: 2_000_000_000n,
    }), {
        gas: 24_204n,
        maxFeePerGas: 122_000_000_000n,
        maxPriorityFeePerGas: 2_000_000_000n,
    })

    assert.equal(buildTransactionGasParameters({
        policy: defaultPolicy,
        estimatedGas: 22_515n,
        maxFeePerGas: 122_000_000_000n,
        maxPriorityFeePerGas: 2_000_000_000n,
    }), undefined)
})

test('a future full-gas-limit chain can configure the reusable policy', () => {
    const futureChainPolicy = createFullGasLimitEIP1559Policy({
        gasLimitMarginBps: 11_000n,
    })

    assert.deepEqual(buildTransactionGasParameters({
        policy: futureChainPolicy,
        estimatedGas: 21_000n,
        maxFeePerGas: 50_000_000_000n,
        maxPriorityFeePerGas: 3_000_000_000n,
    }), {
        gas: 23_100n,
        maxFeePerGas: 50_000_000_000n,
        maxPriorityFeePerGas: 3_000_000_000n,
    })
})

test('reserves protocol balance only for an EIP-7702-delegated account', () => {
    const delegatedCode = `0xef0100${'12'.repeat(20)}`

    assert.equal(isEIP7702DelegatedCode(delegatedCode), true)
    assert.equal(isEIP7702DelegatedCode('0x'), false)
    assert.equal(resolveAccountBalanceReserve({
        policy: monadPolicy,
        accountCode: delegatedCode,
    }), 10n * 10n ** 18n)
    assert.equal(resolveAccountBalanceReserve({
        policy: monadPolicy,
        accountCode: undefined,
    }), 0n)
    assert.equal(resolveAccountBalanceReserve({
        policy: defaultPolicy,
        accountCode: delegatedCode,
    }), 0n)
})
