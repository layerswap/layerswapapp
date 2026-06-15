import { NetworkWithTokens } from "@/Models/Network";
import { HYPERLIQUID_ROUTES, pickHyperliquidDestination } from "./routes";

/** Hyperliquid network token symbol (the app's USDC on HYPERLIQUID_*). Shared by
 * the extended-routes provider and the balance provider. */
export const HYPERLIQUID_USDC_SYMBOL = 'USDC'
/** HyperCore-native token name the `sendToEvmWithData` action withdraws. */
export const HYPERLIQUID_SPOT_TOKEN = 'USDC'
/** Source balance the withdrawal pulls from ('spot' dex; '' would be perp). */
export const HYPERLIQUID_SOURCE_DEX = 'spot'
/** Gas limit for the CCTP forwarding transaction on the destination chain. */
export const HYPERLIQUID_WITHDRAW_GAS_LIMIT = 200000

export type HyperliquidChain = 'Mainnet' | 'Testnet'

export type HyperliquidConfig = {
    nodeUrl: string
    hyperliquidChain: HyperliquidChain
    /** EVM chain id whose domain the typed data is signed against — the chosen
     * CCTP destination chain. The connected wallet must be on this chain to sign. */
    signatureChainId: number
    /** Hex form of signatureChainId, as the action expects it. */
    signatureChainIdHex: `0x${string}`
    /** CCTP destination domain for the chosen destination. */
    destinationCctpDomain: number
}

/**
 * Resolve the HL signing config for a given source. When the user's selected
 * destination matches the primary candidate's (network, token), this picks the
 * fallback — see `pickHyperliquidDestination`.
 */
export function resolveHyperliquidConfig(
    sourceNetworkName: string | undefined,
    networks: NetworkWithTokens[],
    toNetworkName?: string,
    toTokenSymbol?: string,
): HyperliquidConfig | undefined {
    if (!sourceNetworkName) return undefined

    const route = HYPERLIQUID_ROUTES[sourceNetworkName]
    if (!route) return undefined

    const dest = pickHyperliquidDestination(sourceNetworkName, toNetworkName, toTokenSymbol)
    if (!dest) return undefined

    const network = networks.find(n => n.name === sourceNetworkName)

    return {
        nodeUrl: network?.node_url || route.defaultNodeUrl,
        hyperliquidChain: route.hyperliquidChain,
        signatureChainId: dest.signatureChainId,
        signatureChainIdHex: dest.signatureChainIdHex,
        destinationCctpDomain: dest.destinationCctpDomain,
    }
}
