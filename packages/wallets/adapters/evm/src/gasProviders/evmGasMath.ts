import { BASIS_POINTS, type EVMGasPolicy } from "./evmGasPolicies.js";

export const applyGasLimitMargin = (estimatedGas: bigint, policy: EVMGasPolicy) =>
    (estimatedGas * policy.gasLimitMarginBps + BASIS_POINTS - 1n) / BASIS_POINTS

const EIP7702_DELEGATION_DESIGNATOR = /^0xef0100[0-9a-f]{40}$/i

export const isEIP7702DelegatedCode = (accountCode?: `0x${string}`) =>
    accountCode !== undefined && EIP7702_DELEGATION_DESIGNATOR.test(accountCode)

export const resolveAccountBalanceReserve = ({
    policy,
    accountCode,
}: {
    policy: EVMGasPolicy
    accountCode?: `0x${string}`
}) => {
    const reserve = policy.accountBalanceReserve
    if (!reserve) return 0n

    switch (reserve.condition) {
        case 'eip7702-delegated':
            return isEIP7702DelegatedCode(accountCode) ? reserve.amount : 0n
    }
}

type CalculateGasFeeAmountsArgs = {
    policy: EVMGasPolicy
    estimatedGas: bigint
    gasPrice?: bigint
    maxFeePerGas?: bigint
}

export const calculateGasFeeAmounts = ({
    policy,
    estimatedGas,
    gasPrice,
    maxFeePerGas,
}: CalculateGasFeeAmountsArgs) => {
    const maximumGasPrice = policy.transactionGasMode === 'explicit-legacy'
        ? gasPrice
        : maxFeePerGas ?? gasPrice
    if (maximumGasPrice === undefined) return undefined

    const gasLimit = applyGasLimitMargin(estimatedGas, policy)
    const expectedGasPrice = policy.feeQuoteMode === 'current-capped' && gasPrice !== undefined
        ? gasPrice < maximumGasPrice ? gasPrice : maximumGasPrice
        : maximumGasPrice

    return {
        gasLimit,
        estimatedFee: gasLimit * expectedGasPrice,
        maximumFee: gasLimit * maximumGasPrice,
    }
}

type BuildTransactionGasParametersArgs = {
    policy: EVMGasPolicy
    estimatedGas: bigint
    gasPrice?: bigint
    maxFeePerGas?: bigint
    maxPriorityFeePerGas?: bigint
}

export const buildTransactionGasParameters = ({
    policy,
    estimatedGas,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
}: BuildTransactionGasParametersArgs) => {
    if (policy.transactionGasMode === 'wallet') {
        return undefined
    }

    const gas = applyGasLimitMargin(estimatedGas, policy)
    if (policy.transactionGasMode === 'explicit-legacy') {
        if (gasPrice === undefined) {
            throw new Error('Legacy gas price is unavailable')
        }
        return { gas, gasPrice }
    }

    if (maxFeePerGas === undefined || maxPriorityFeePerGas === undefined) {
        throw new Error('EIP-1559 fee data is unavailable')
    }

    return {
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
    }
}
