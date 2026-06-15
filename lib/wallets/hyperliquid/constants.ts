import { NetworkWithTokens } from "@/Models/Network";
import { HYPERLIQUID_ROUTES } from "./routes";

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
    /** EVM chain id whose domain the typed data is signed against (the destination
     * chain — Base). The connected wallet must be on this chain to sign. */
    signatureChainId: number
    /** Hex form of signatureChainId, as the action expects it. */
    signatureChainIdHex: `0x${string}`
    /** CCTP destination domain (6 = Base / Base Sepolia). */
    destinationCctpDomain: number
}

export function resolveHyperliquidConfig(sourceNetworkName: string | undefined, networks: NetworkWithTokens[]): HyperliquidConfig | undefined {
    if (!sourceNetworkName) return undefined

    const route = HYPERLIQUID_ROUTES[sourceNetworkName]
    if (!route) return undefined

    const network = networks.find(n => n.name === sourceNetworkName)

    return {
        nodeUrl: network?.node_url || route.defaultNodeUrl,
        hyperliquidChain: route.hyperliquidChain,
        signatureChainId: route.signatureChainId,
        signatureChainIdHex: route.signatureChainIdHex,
        destinationCctpDomain: route.destinationCctpDomain,
    }
}
