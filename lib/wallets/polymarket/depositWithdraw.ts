import { encodeFunctionData, erc20Abi, type Hex, type WalletClient } from "viem";
import {
    POLYMARKET_CHAIN_ID,
    POLYMARKET_COLLATERAL_OFFRAMP,
    POLYMARKET_DEPOSIT_WALLET_FACTORY,
    POLYMARKET_OFFRAMP_ABI,
    POLYMARKET_PUSD_ADDRESS,
    POLYMARKET_USDC_E_ADDRESS,
} from "./constants";
import type { DepositWalletBatchRequest, DepositWalletCreateRequest } from "./relayerClient";

/**
 * Deposit-wallet (modern ERC-1967 funder) gasless batch, in pure viem — no
 * @polymarket SDK. Port of the SDK's deposit-wallet scheme: EIP-712 typed-data
 * (`Batch`) signature over an ordered list of calls + nonce + deadline. The deposit
 * wallet executes each call as `msg.sender`; the relayer broadcasts it gaslessly.
 */

const DEPOSIT_WALLET_DOMAIN_NAME = 'DepositWallet'
const DEPOSIT_WALLET_DOMAIN_VERSION = '1'

const DEPOSIT_WALLET_TYPES = {
    Call: [
        { name: 'target', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'data', type: 'bytes' },
    ],
    Batch: [
        { name: 'wallet', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'calls', type: 'Call[]' },
    ],
} as const

/** Relayer request that deploys the user's deposit wallet (gasless, no signature). */
export function buildDepositWalletDeployRequest(fromEoa: `0x${string}`): DepositWalletCreateRequest {
    return { type: 'WALLET-CREATE', from: fromEoa, to: POLYMARKET_DEPOSIT_WALLET_FACTORY }
}

export type DepositWalletCallInput = { target: `0x${string}`; value?: bigint; data: Hex }

export type BuildDepositBatchParams = {
    /** Connected viem wallet client (the deposit-wallet owner EOA). */
    walletClient: WalletClient
    fromEoa: `0x${string}`
    /** The derived deposit wallet that holds the collateral + executes the calls. */
    depositWallet: `0x${string}`
    /** Ordered calls, executed sequentially by the deposit wallet. */
    calls: DepositWalletCallInput[]
    /** Current relayer nonce for the owner EOA (type WALLET). */
    nonce: string
    /** Unix-seconds deadline for the batch signature. */
    deadline: string
}

export async function buildDepositWalletBatchRequest(params: BuildDepositBatchParams): Promise<DepositWalletBatchRequest> {
    const calls = params.calls.map(c => ({ target: c.target, value: c.value ?? 0n, data: c.data }))

    const signature = await params.walletClient.signTypedData({
        account: params.fromEoa,
        domain: {
            name: DEPOSIT_WALLET_DOMAIN_NAME,
            version: DEPOSIT_WALLET_DOMAIN_VERSION,
            chainId: POLYMARKET_CHAIN_ID,
            verifyingContract: params.depositWallet,
        },
        types: DEPOSIT_WALLET_TYPES,
        primaryType: 'Batch',
        message: {
            wallet: params.depositWallet,
            nonce: BigInt(params.nonce),
            deadline: BigInt(params.deadline),
            calls,
        },
    })

    return {
        type: 'WALLET',
        from: params.fromEoa,
        to: POLYMARKET_DEPOSIT_WALLET_FACTORY,
        nonce: params.nonce,
        signature,
        depositWalletParams: {
            depositWallet: params.depositWallet,
            deadline: params.deadline,
            calls: calls.map(c => ({ target: c.target, value: c.value.toString(), data: c.data })),
        },
    }
}

export type BuildDepositCallsParams = {
    /** The token the funder currently holds (pUSD → needs unwrap; USDC.e → deposit directly). */
    funderTokenAddress: `0x${string}`
    /** The funder/deposit wallet itself — unwrap target and the address that approves + deposits. */
    funderAddress: `0x${string}`
    /** Single amount used across approve/unwrap/deposit (pUSD↔USDC.e is 1:1, both 6 decimals). */
    amountBaseUnits: bigint
    /** Layerswap Depository contract (the deposit action's `to_address`) — approval + deposit target. */
    depository: `0x${string}`
    /** Backend-encoded `depositERC20(...)` calldata (the deposit action's `call_data`). */
    depositCallData: Hex
}

/**
 * Flow 2 calls for the deposit-wallet batch:
 *   pUSD funder → [approve pUSD→offramp, unwrap pUSD→USDC.e, approve USDC.e→depository, depositERC20]
 *   USDC.e funder → [approve USDC.e→depository, depositERC20]
 * The deposit leg reuses the backend `call_data`/`to_address` verbatim (no client-side encoding).
 */
export function buildPolymarketDepositCalls(params: BuildDepositCallsParams): DepositWalletCallInput[] {
    const { funderTokenAddress, funderAddress, amountBaseUnits, depository, depositCallData } = params

    const approveDepository: DepositWalletCallInput = {
        target: POLYMARKET_USDC_E_ADDRESS,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [depository, amountBaseUnits] }),
    }
    const deposit: DepositWalletCallInput = { target: depository, data: depositCallData }

    const holdsPusd = funderTokenAddress.toLowerCase() === POLYMARKET_PUSD_ADDRESS.toLowerCase()
    if (!holdsPusd) return [approveDepository, deposit]

    return [
        {
            target: POLYMARKET_PUSD_ADDRESS,
            data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [POLYMARKET_COLLATERAL_OFFRAMP, amountBaseUnits] }),
        },
        {
            target: POLYMARKET_COLLATERAL_OFFRAMP,
            data: encodeFunctionData({ abi: POLYMARKET_OFFRAMP_ABI, functionName: 'unwrap', args: [POLYMARKET_USDC_E_ADDRESS, funderAddress, amountBaseUnits] }),
        },
        approveDepository,
        deposit,
    ]
}
