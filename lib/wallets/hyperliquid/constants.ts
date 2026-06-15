import { NetworkWithTokens } from "@/Models/Network";
import KnownInternalNames from "@/lib/knownIds";

/** CCTP forwarding fee for the destination, in USDC. The live fee shown in
 * quotes/limits is the provider mapping's `flatFee`; this mirrors it. */
export const HYPERLIQUID_WITHDRAW_FEE = 0.2
/** Typical CCTP arrival time. */
export const HYPERLIQUID_ARRIVAL_SECONDS = 300

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

const MAINNET_NODE = "https://api.hyperliquid.xyz"
const TESTNET_NODE = "https://api.hyperliquid-testnet.xyz"

/** Base (and Base Sepolia) CCTP domain. */
const BASE_CCTP_DOMAIN = 6

export function resolveHyperliquidConfig(sourceNetworkName: string | undefined, networks: NetworkWithTokens[]): HyperliquidConfig | undefined {
    if (!sourceNetworkName) return undefined

    const isTestnet = sourceNetworkName === KnownInternalNames.Networks.HyperliquidTestnet
    const isMainnet = sourceNetworkName === KnownInternalNames.Networks.HyperliquidMainnet
    if (!isTestnet && !isMainnet) return undefined

    const network = networks.find(n => n.name === sourceNetworkName)
    const nodeUrl = network?.node_url || (isMainnet ? MAINNET_NODE : TESTNET_NODE)

    return isMainnet
        ? { nodeUrl, hyperliquidChain: 'Mainnet', signatureChainId: 8453, signatureChainIdHex: '0x2105', destinationCctpDomain: BASE_CCTP_DOMAIN }
        : { nodeUrl, hyperliquidChain: 'Testnet', signatureChainId: 84532, signatureChainIdHex: '0x14a34', destinationCctpDomain: BASE_CCTP_DOMAIN }
}
