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

type EVMFeeData = {
    policy: EVMGasPolicy
    gasPrice?: bigint
    maxFeePerGas?: bigint
    maxPriorityFeePerGas?: bigint
}

/** Quotes must have every fee field required to prepare an explicit transaction. */
const resolveExplicitTransactionFees = ({ policy, gasPrice, maxFeePerGas, maxPriorityFeePerGas }: EVMFeeData) => {
    if (policy.transactionGasMode === 'explicit-legacy') {
        return gasPrice === undefined ? undefined : { gasPrice }
    }

    if (policy.transactionGasMode === 'explicit-eip1559'
        && maxFeePerGas !== undefined && maxPriorityFeePerGas !== undefined) {
        return { maxFeePerGas, maxPriorityFeePerGas }
    }

    return undefined
}

type CalculateGasFeeAmountsArgs = EVMFeeData & {
    estimatedGas: bigint
}

export const calculateGasFeeAmounts = ({
    policy,
    estimatedGas,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
}: CalculateGasFeeAmountsArgs) => {
    if (policy.transactionGasMode !== 'wallet' && !resolveExplicitTransactionFees({
        policy, gasPrice, maxFeePerGas, maxPriorityFeePerGas,
    })) {
        return undefined
    }

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

type BuildTransactionGasParametersArgs = EVMFeeData & {
    estimatedGas: bigint
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

    const fees = resolveExplicitTransactionFees({ policy, gasPrice, maxFeePerGas, maxPriorityFeePerGas })
    if (!fees) {
        const message = policy.transactionGasMode === 'explicit-legacy'
            ? 'Legacy gas price is unavailable'
            : 'EIP-1559 fee data is unavailable'
        throw new Error(message)
    }

    return {
        gas: applyGasLimitMargin(estimatedGas, policy),
        ...fees,
    }
}
