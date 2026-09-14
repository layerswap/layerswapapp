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
    const maximumGasPrice = maxFeePerGas ?? gasPrice
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
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
}

export const buildTransactionGasParameters = ({
    policy,
    estimatedGas,
    maxFeePerGas,
    maxPriorityFeePerGas,
}: BuildTransactionGasParametersArgs) => {
    if (policy.transactionGasMode !== 'explicit-eip1559') return undefined

    return {
        gas: applyGasLimitMargin(estimatedGas, policy),
        maxFeePerGas,
        maxPriorityFeePerGas,
    }
}
