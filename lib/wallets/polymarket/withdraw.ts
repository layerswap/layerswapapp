import { encodeFunctionData, encodePacked, erc20Abi, hashTypedData, hexToBigInt, zeroAddress, type Hex, type WalletClient } from "viem";
import { POLYMARKET_CHAIN_ID, POLYMARKET_PUSD_ADDRESS } from "./constants";
import { derivePolymarketSafe } from "./derive";
import type { SafeTransactionRequest } from "./relayerClient";

/**
 * Gnosis-Safe (legacy funder) gasless transfer, in pure viem — no @polymarket SDK.
 * Port of the SDK's Safe scheme: hash the EIP-712 `SafeTx` struct, sign that hash as a
 * raw message (eth_sign), and pack r/s/(v+4) into Gnosis format. The relayer broadcasts
 * it gaslessly; submit the returned request via the relayer proxy.
 */

const SAFE_TX_TYPES = {
    SafeTx: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'data', type: 'bytes' },
        { name: 'operation', type: 'uint8' },
        { name: 'safeTxGas', type: 'uint256' },
        { name: 'baseGas', type: 'uint256' },
        { name: 'gasPrice', type: 'uint256' },
        { name: 'gasToken', type: 'address' },
        { name: 'refundReceiver', type: 'address' },
        { name: 'nonce', type: 'uint256' },
    ],
} as const

/** Pack an eth_sign signature into the Gnosis Safe rsv format (v += 4 for eth_sign). */
function packGnosisSignature(sig: Hex): Hex {
    let v = parseInt(sig.slice(-2), 16)
    if (v === 0 || v === 1) v += 31
    else if (v === 27 || v === 28) v += 4
    else throw new Error('Invalid signature v')
    const r = hexToBigInt(`0x${sig.slice(2, 66)}` as Hex)
    const s = hexToBigInt(`0x${sig.slice(66, 130)}` as Hex)
    return encodePacked(['uint256', 'uint256', 'uint8'], [r, s, v])
}

export type BuildPusdTransferParams = {
    /** Connected viem wallet client (the Polymarket owner EOA). */
    walletClient: WalletClient
    /** The owner EOA address (the Safe's single owner / signer). */
    fromEoa: `0x${string}`
    /** Recipient of the transfer — the Polymarket bridge address (from `POST /withdraw`). */
    bridgeAddress: `0x${string}`
    /** Amount in base units (6 decimals). */
    amountBaseUnits: bigint
    /** Token to move out (pUSD, or legacy USDC.e). Defaults to pUSD. */
    tokenAddress?: `0x${string}`
    /** Current Safe nonce (from the relayer). */
    nonce: string
    /** Optional human-readable label recorded with the relayer transaction. */
    metadata?: string
}

export async function buildPusdTransferRequest(params: BuildPusdTransferParams): Promise<SafeTransactionRequest> {
    const safe = derivePolymarketSafe(params.fromEoa)
    const token = params.tokenAddress ?? POLYMARKET_PUSD_ADDRESS
    const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [params.bridgeAddress, params.amountBaseUnits],
    })

    const structHash = hashTypedData({
        primaryType: 'SafeTx',
        domain: { chainId: POLYMARKET_CHAIN_ID, verifyingContract: safe },
        types: SAFE_TX_TYPES,
        message: {
            to: token,
            value: 0n,
            data,
            operation: 0,
            safeTxGas: 0n,
            baseGas: 0n,
            gasPrice: 0n,
            gasToken: zeroAddress,
            refundReceiver: zeroAddress,
            nonce: BigInt(params.nonce),
        },
    })

    const sig = await params.walletClient.signMessage({ account: params.fromEoa, message: { raw: structHash } })

    return {
        type: 'SAFE',
        from: params.fromEoa,
        to: token,
        proxyWallet: safe,
        data,
        nonce: params.nonce,
        signature: packGnosisSignature(sig),
        signatureParams: { gasPrice: '0', operation: '0', safeTxnGas: '0', baseGas: '0', gasToken: zeroAddress, refundReceiver: zeroAddress },
        metadata: params.metadata,
    }
}
