export const BASIS_POINTS = 10_000n

export type EVMFeeQuoteMode = 'maximum' | 'current-capped'
export type EVMTransactionGasMode = 'wallet' | 'explicit-eip1559' | 'explicit-legacy'
export type EVMAccountReserveCondition = 'eip7702-delegated'

export type EVMAccountBalanceReserve = Readonly<{
    amount: bigint
    condition: EVMAccountReserveCondition
}>

export type EVMGasPolicy = Readonly<{
    /** Price headroom used by viem's fee estimator, separate from gas units. */
    baseFeeMultiplier: number
    minPriorityFeePerGasGwei?: string
    gasLimitMarginBps: bigint
    feeQuoteMode: EVMFeeQuoteMode
    reserveMaximumFee: boolean
    transactionGasMode: EVMTransactionGasMode
    checkBalanceBeforeSend: boolean
    accountBalanceReserve?: EVMAccountBalanceReserve
}>

const DEFAULT_EVM_GAS_POLICY: EVMGasPolicy = Object.freeze({
    baseFeeMultiplier: 1.2,
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
    if (!Number.isFinite(policy.baseFeeMultiplier) || policy.baseFeeMultiplier < 1) {
        throw new Error('EVM base-fee multiplier cannot be lower than 1')
    }
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

// All chain-specific gas overrides belong here. Entries not overriding transaction
// mode still let the wallet set submission fees. Unknown/new chain IDs use the
// default policy; review their fee model before opting into explicit submission.
const EVM_GAS_POLICIES_BY_CHAIN_ID = new Map<number, EVMGasPolicy>([
    // Quote the same limit and fees we pass to the wallet. Otherwise a wallet's
    // fee defaults can make a native MAX transfer exceed the account balance.
    // Keep 20% execution headroom in both paths, rather than adding it only
    // when submitting a transaction whose MAX amount has already been set.
    // Ethereum mainnet
    [1, createEVMGasPolicy({
        baseFeeMultiplier: 1.7,
        gasLimitMarginBps: 12_000n,
        reserveMaximumFee: true,
        transactionGasMode: 'explicit-eip1559',
        checkBalanceBeforeSend: true,
    })],
    // BNB Smart Chain mainnet: retain 1.2x price headroom for legacy fees.
    [56, createEVMGasPolicy({
        baseFeeMultiplier: 1.2,
        gasLimitMarginBps: 12_000n,
        reserveMaximumFee: true,
        transactionGasMode: 'explicit-legacy',
        checkBalanceBeforeSend: true,
    })],
    // Monad charges the complete signed gas limit and applies a 10 MON reserve
    // to EIP-7702-delegated accounts.
    [143, MONAD_GAS_POLICY], // Monad mainnet
    [10143, MONAD_GAS_POLICY], // Monad testnet

    [324, createEVMGasPolicy({ baseFeeMultiplier: 1.7 })], // ZKsync Era
    [137, createEVMGasPolicy({ baseFeeMultiplier: 1.01 })], // Polygon
    [42161, createEVMGasPolicy({ baseFeeMultiplier: 4.15 })], // Arbitrum One
    [42170, createEVMGasPolicy({ baseFeeMultiplier: 1.7 })], // Arbitrum Nova
    [10, createEVMGasPolicy({ // Optimism
        baseFeeMultiplier: 1.5,
        minPriorityFeePerGasGwei: '0.0001',
    })],
    [534352, createEVMGasPolicy({ baseFeeMultiplier: 1.5 })], // Scroll
    [48900, createEVMGasPolicy({ baseFeeMultiplier: 1.5 })], // Zircuit
    [2741, createEVMGasPolicy({ baseFeeMultiplier: 1.9 })], // Abstract
    [59144, createEVMGasPolicy({ baseFeeMultiplier: 1.7 })], // Linea
    [8453, createEVMGasPolicy({ baseFeeMultiplier: 1.7 })], // Base
    [169, createEVMGasPolicy({ baseFeeMultiplier: 1.7 })], // Manta Pacific
    [570, createEVMGasPolicy({ baseFeeMultiplier: 1.7 })], // Rollux
    [204, createEVMGasPolicy({ baseFeeMultiplier: 1.7 })], // opBNB
    [424, createEVMGasPolicy({ baseFeeMultiplier: 2.1 })], // PGN
    [43114, createEVMGasPolicy({ // Avalanche C-Chain
        baseFeeMultiplier: 1.7,
        minPriorityFeePerGasGwei: '1.5',
    })],
    [7777777, createEVMGasPolicy({ baseFeeMultiplier: 1.7 })], // Zora
    [690, createEVMGasPolicy({ baseFeeMultiplier: 1.7 })], // Redstone
])

export const resolveEVMGasPolicy = (chainId: number): EVMGasPolicy =>
    EVM_GAS_POLICIES_BY_CHAIN_ID.get(chainId) ?? DEFAULT_EVM_GAS_POLICY
