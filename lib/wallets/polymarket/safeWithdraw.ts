import { concat, encodeFunctionData, encodePacked, hashTypedData, hexToBigInt, size, zeroAddress, type Hex, type WalletClient } from "viem";
import { POLYMARKET_CHAIN_ID, POLYMARKET_SAFE_MULTISEND } from "./constants";
import type { PolymarketCall } from "./depositWithdraw";
import type { SafeTransactionRequest } from "./relayerClient";

/**
 * Gnosis-Safe (legacy funder) gasless batch, in pure viem — no @polymarket SDK.
 *
 * A Safe executes ONE call per `execTransaction`, so to run the Flow-2 batch
 * (approve → unwrap → approve → depositERC20) in a single signature we DELEGATECALL
 * the Safe `MultiSend` contract: `operation = 1`, `to = MultiSend`, `data = multiSend(txns)`.
 * The Safe then runs each inner call as itself (`msg.sender = Safe`), which is exactly
 * what the approvals/deposit require. Signing mirrors the SDK's Safe scheme: hash the
 * EIP-712 `SafeTx` struct, sign that hash as a raw message (eth_sign), and pack r/s/(v+4)
 * into Gnosis format. The relayer broadcasts it gaslessly.
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

export const MULTISEND_ABI = [
    {
        type: 'function',
        name: 'multiSend',
        stateMutability: 'payable',
        inputs: [{ name: 'transactions', type: 'bytes' }],
        outputs: [],
    },
] as const

// Gnosis Safe delegatecall operation for the outer SafeTx (MultiSend must be delegatecalled).
const SAFE_OP_DELEGATECALL = 1
// Per-inner-call operation inside the MultiSend payload — all our calls are plain CALLs.
const MULTISEND_OP_CALL = 0

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

/**
 * Encode calls into Gnosis `MultiSend` calldata. Each inner tx is packed as
 * `operation(1) . to(20) . value(32) . dataLength(32) . data`, concatenated, then
 * wrapped in `multiSend(bytes)`. Standard Gnosis format — the delegatecalled MultiSend
 * walks the blob and executes each inner call in order.
 */
export function encodeSafeMultiSend(calls: PolymarketCall[]): Hex {
    const packed = concat(
        calls.map(c =>
            encodePacked(
                ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
                [MULTISEND_OP_CALL, c.target, c.value ?? 0n, BigInt(size(c.data)), c.data],
            ),
        ),
    )
    return encodeFunctionData({ abi: MULTISEND_ABI, functionName: 'multiSend', args: [packed] })
}

export type BuildSafeBatchParams = {
    /** Connected viem wallet client (the Safe's single owner / signer EOA). */
    walletClient: WalletClient
    /** The owner EOA address. */
    fromEoa: `0x${string}`
    /** The derived Safe funder that holds the collateral + executes the batch. */
    safe: `0x${string}`
    /** Ordered calls the Safe runs (as itself) via a MultiSend delegatecall. */
    calls: PolymarketCall[]
    /** Current Safe nonce (from the relayer, type SAFE). */
    nonce: string
}

export async function buildSafeBatchRequest(params: BuildSafeBatchParams): Promise<SafeTransactionRequest> {
    const data = encodeSafeMultiSend(params.calls)
    const to = POLYMARKET_SAFE_MULTISEND

    const structHash = hashTypedData({
        primaryType: 'SafeTx',
        domain: { chainId: POLYMARKET_CHAIN_ID, verifyingContract: params.safe },
        types: SAFE_TX_TYPES,
        message: {
            to,
            value: 0n,
            data,
            operation: SAFE_OP_DELEGATECALL,
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
        to,
        proxyWallet: params.safe,
        data,
        nonce: params.nonce,
        signature: packGnosisSignature(sig),
        signatureParams: {
            gasPrice: '0',
            operation: String(SAFE_OP_DELEGATECALL),
            safeTxnGas: '0',
            baseGas: '0',
            gasToken: zeroAddress,
            refundReceiver: zeroAddress,
        },
        metadata: '',
    }
}
