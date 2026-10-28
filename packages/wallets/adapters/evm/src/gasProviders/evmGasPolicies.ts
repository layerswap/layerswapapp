export const BASIS_POINTS = 10_000n

export type EVMFeeQuoteMode = 'maximum' | 'current-capped'
export type EVMTransactionGasMode = 'wallet' | 'explicit-eip1559' | 'explicit-legacy'
export type EVMAccountReserveCondition = 'eip7702-delegated'

export type EVMAccountBalanceReserve = Readonly<{
    amount: bigint
    condition: EVMAccountReserveCondition
}>

export type EVMGasPolicy = Readonly<{
    gasLimitMarginBps: bigint
    feeQuoteMode: EVMFeeQuoteMode
    reserveMaximumFee: boolean
    transactionGasMode: EVMTransactionGasMode
    checkBalanceBeforeSend: boolean
    accountBalanceReserve?: EVMAccountBalanceReserve
}>

const DEFAULT_EVM_GAS_POLICY: EVMGasPolicy = Object.freeze({
    gasLimitMarginBps: BASIS_POINTS,
    feeQuoteMode: 'maximum',
    reserveMaximumFee: false,
    transactionGasMode: 'wallet',
    checkBalanceBeforeSend: false,
})

export const createEVMGasPolicy = (
    overrides: Partial<EVMGasPolicy> = {},
): EVMGasPolicy => {
    const policy = { ...DEFAULT_EVM_GAS_POLICY, ...overrides }
    if (policy.gasLimitMarginBps < BASIS_POINTS) {
        throw new Error('EVM gas-limit margin cannot be lower than 100%')
    }

    return Object.freeze(policy)
}

/**
 * Reusable policy for EIP-1559 chains that charge the signed gas limit instead
 * of refunding unused gas. It keeps quotes honest while making the signed limit
 * and fee cap deterministic.
 */
export const createFullGasLimitEIP1559Policy = ({
    gasLimitMarginBps,
    accountBalanceReserve,
}: {
    gasLimitMarginBps: bigint
    accountBalanceReserve?: EVMAccountBalanceReserve
}) =>
    createEVMGasPolicy({
        gasLimitMarginBps,
        feeQuoteMode: 'current-capped',
        reserveMaximumFee: true,
        transactionGasMode: 'explicit-eip1559',
        accountBalanceReserve,
    })

const MONAD_ACCOUNT_RESERVE = 10n * 10n ** 18n
const MONAD_GAS_POLICY = createFullGasLimitEIP1559Policy({
    gasLimitMarginBps: 10_750n,
    accountBalanceReserve: {
        amount: MONAD_ACCOUNT_RESERVE,
        condition: 'eip7702-delegated',
    },
})

const EVM_GAS_POLICIES_BY_CHAIN_ID = new Map<number, EVMGasPolicy>([
    // Quote the same limit and fees we pass to the wallet. Otherwise a wallet's
    // fee defaults can make a native MAX transfer exceed the account balance.
    // Keep 20% execution headroom in both paths, rather than adding it only
    // when submitting a transaction whose MAX amount has already been set.
    [1, createEVMGasPolicy({
        gasLimitMarginBps: 12_000n,
        reserveMaximumFee: true,
        transactionGasMode: 'explicit-eip1559',
        checkBalanceBeforeSend: true,
    })],
    [56, createEVMGasPolicy({
        gasLimitMarginBps: 12_000n,
        reserveMaximumFee: true,
        transactionGasMode: 'explicit-legacy',
        checkBalanceBeforeSend: true,
    })],
    // Monad charges the complete signed gas limit and applies a 10 MON reserve
    // to EIP-7702-delegated accounts.
    [143, MONAD_GAS_POLICY],
    [10143, MONAD_GAS_POLICY],
])

export const resolveEVMGasPolicy = (chainId: number): EVMGasPolicy =>
    EVM_GAS_POLICIES_BY_CHAIN_ID.get(chainId) ?? DEFAULT_EVM_GAS_POLICY
