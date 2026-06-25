import { encodeFunctionData, erc20Abi, type WalletClient } from "viem";
import { POLYMARKET_CHAIN_ID, POLYMARKET_DEPOSIT_WALLET_FACTORY } from "./constants";
import type { DepositWalletBatchRequest, DepositWalletCreateRequest } from "./relayerClient";

/**
 * Deposit-wallet (modern ERC-1967 funder) gasless transfer, in pure viem — no
 * @polymarket SDK. Port of the SDK's deposit-wallet scheme: EIP-712 typed-data
 * (`Batch`) signature over the calls + nonce + deadline. The relayer broadcasts it
 * gaslessly; submit the returned request via the relayer proxy.
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

export type BuildDepositTransferParams = {
    /** Connected viem wallet client (the deposit-wallet owner EOA). */
    walletClient: WalletClient
    fromEoa: `0x${string}`
    /** The derived deposit wallet that holds the collateral. */
    depositWallet: `0x${string}`
    /** Token to move out (pUSD, or legacy USDC.e). */
    tokenAddress: `0x${string}`
    /** Recipient of the transfer — the Polymarket bridge address (from `POST /withdraw`). */
    bridgeAddress: `0x${string}`
    amountBaseUnits: bigint
    /** Current relayer nonce for the owner EOA (type WALLET). */
    nonce: string
    /** Unix-seconds deadline for the batch signature. */
    deadline: string
}

export async function buildDepositWalletTransferRequest(params: BuildDepositTransferParams): Promise<DepositWalletBatchRequest> {
    const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [params.bridgeAddress, params.amountBaseUnits],
    })

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
            calls: [{ target: params.tokenAddress, value: 0n, data }],
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
            calls: [{ target: params.tokenAddress, value: '0', data }],
        },
    }
}
