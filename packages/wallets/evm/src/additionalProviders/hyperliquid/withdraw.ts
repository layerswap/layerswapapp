import { signTypedData } from '@wagmi/core'
import { parseSignature } from 'viem'
import { Config } from 'wagmi'
import { HyperliquidConfig, HYPERLIQUID_SOURCE_DEX, HYPERLIQUID_SPOT_TOKEN, HYPERLIQUID_WITHDRAW_GAS_LIMIT } from './constants'
import { HyperliquidSendToEvmAction, HyperliquidSignature, HyperliquidUsdClassTransferAction } from './hyperliquidClient'

export type SignSendToEvmParams = {
    /** Recipient address on the destination chain. */
    destinationRecipient: string
    /** Plain decimal USDC string — the amount that leaves HyperCore (A). */
    amount: string
    /** Nonce, in ms; Hyperliquid requires `nonce === action.nonce`. */
    nonce: number
    account?: `0x${string}`
    /** Source pool to pull from: 'spot' (default) or '' for perp. */
    sourceDex?: string
}

/**
 * EIP-712-sign a Hyperliquid `sendToEvmWithData` action with the connected EVM
 * wallet. HyperCore burns the USDC through HyperEVM via Circle CCTP and (with
 * `data: '0x'`) auto-mints + forwards it to the recipient on the destination chain.
 * The domain chainId is the destination chain id (Base); the connected wallet
 * must be on that chain (some wallets reject foreign-domain typed data) — enforced
 * by the step component's ChangeNetwork branch.
 */
export async function signSendToEvm(
    wagmiConfig: Config,
    hlConfig: HyperliquidConfig,
    params: SignSendToEvmParams,
): Promise<{ action: HyperliquidSendToEvmAction; signature: HyperliquidSignature }> {
    const destinationRecipient = params.destinationRecipient.toLowerCase()

    const action: HyperliquidSendToEvmAction = {
        type: 'sendToEvmWithData',
        hyperliquidChain: hlConfig.hyperliquidChain,
        signatureChainId: hlConfig.signatureChainIdHex,
        token: HYPERLIQUID_SPOT_TOKEN,
        amount: params.amount,
        sourceDex: params.sourceDex ?? HYPERLIQUID_SOURCE_DEX,
        destinationRecipient,
        addressEncoding: 'hex',
        destinationChainId: hlConfig.destinationCctpDomain,
        gasLimit: HYPERLIQUID_WITHDRAW_GAS_LIMIT,
        data: '0x',
        nonce: params.nonce,
    }

    const typedData = {
        account: params.account,
        domain: {
            name: 'HyperliquidSignTransaction',
            version: '1',
            chainId: hlConfig.signatureChainId,
            verifyingContract: '0x0000000000000000000000000000000000000000',
        },
        types: {
            'HyperliquidTransaction:SendToEvmWithData': [
                { name: 'hyperliquidChain', type: 'string' },
                { name: 'token', type: 'string' },
                { name: 'amount', type: 'string' },
                { name: 'sourceDex', type: 'string' },
                { name: 'destinationRecipient', type: 'string' },
                { name: 'addressEncoding', type: 'string' },
                { name: 'destinationChainId', type: 'uint32' },
                { name: 'gasLimit', type: 'uint64' },
                { name: 'data', type: 'bytes' },
                { name: 'nonce', type: 'uint64' },
            ],
        },
        primaryType: 'HyperliquidTransaction:SendToEvmWithData',
        message: {
            hyperliquidChain: action.hyperliquidChain,
            token: action.token,
            amount: action.amount,
            sourceDex: action.sourceDex,
            destinationRecipient,
            addressEncoding: action.addressEncoding,
            destinationChainId: action.destinationChainId,
            gasLimit: BigInt(action.gasLimit),
            data: action.data,
            nonce: BigInt(action.nonce),
        },
    }

    const signatureHex = await signTypedData(wagmiConfig, typedData as any)

    const parsed = parseSignature(signatureHex)
    const v = parsed.v !== undefined ? Number(parsed.v) : (parsed.yParity ?? 0) + 27

    return {
        action,
        signature: { r: parsed.r, s: parsed.s, v },
    }
}

export type SignUsdClassTransferParams = {
    /** Plain decimal USDC string to move between pools. */
    amount: string
    /** true = spot→perp, false = perp→spot. */
    toPerp: boolean
    /** Nonce, in ms; Hyperliquid requires `nonce === action.nonce`. */
    nonce: number
    account?: `0x${string}`
}

/**
 * EIP-712-sign a Hyperliquid `usdClassTransfer` action — moves USDC between the
 * connected account's perp and spot pools on HyperCore. Mirrors `signSendToEvm`:
 * same `HyperliquidSignTransaction` domain, signed against the destination chain
 * id (`hlConfig.signatureChainId`), which the wallet is already forced onto by the
 * step component's ChangeNetwork gate — so no extra network switch is introduced.
 */
export async function signUsdClassTransfer(
    wagmiConfig: Config,
    hlConfig: HyperliquidConfig,
    params: SignUsdClassTransferParams,
): Promise<{ action: HyperliquidUsdClassTransferAction; signature: HyperliquidSignature }> {
    const action: HyperliquidUsdClassTransferAction = {
        type: 'usdClassTransfer',
        hyperliquidChain: hlConfig.hyperliquidChain,
        signatureChainId: hlConfig.signatureChainIdHex,
        amount: params.amount,
        toPerp: params.toPerp,
        nonce: params.nonce,
    }

    const typedData = {
        account: params.account,
        domain: {
            name: 'HyperliquidSignTransaction',
            version: '1',
            chainId: hlConfig.signatureChainId,
            verifyingContract: '0x0000000000000000000000000000000000000000',
        },
        types: {
            'HyperliquidTransaction:UsdClassTransfer': [
                { name: 'hyperliquidChain', type: 'string' },
                { name: 'amount', type: 'string' },
                { name: 'toPerp', type: 'bool' },
                { name: 'nonce', type: 'uint64' },
            ],
        },
        primaryType: 'HyperliquidTransaction:UsdClassTransfer',
        message: {
            hyperliquidChain: action.hyperliquidChain,
            amount: action.amount,
            toPerp: action.toPerp,
            nonce: BigInt(action.nonce),
        },
    }

    const signatureHex = await signTypedData(wagmiConfig, typedData as any)

    const parsed = parseSignature(signatureHex)
    const v = parsed.v !== undefined ? Number(parsed.v) : (parsed.yParity ?? 0) + 27

    return {
        action,
        signature: { r: parsed.r, s: parsed.s, v },
    }
}
