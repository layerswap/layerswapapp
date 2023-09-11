import { Layer } from "../Models/Layer";

export default function resolveChain (layer: Layer) {

    if (layer.isExchange == true)
        return null

    const network = layer.assets[0].network
    const nativeCurrency = network.currencies.find(c => c.asset === network.native_currency);

    return {
        id: Number(network.chain_id),
        name: network.display_name,
        network: network.internal_name,
        nativeCurrency: { name: nativeCurrency?.name, symbol: nativeCurrency?.asset, decimals: nativeCurrency?.decimals },
        rpcUrls: {
            default: {
                http: network.nodes.map(n => n?.url),
            },
            public: {
                http: network.nodes.map(n => n?.url),
            },
        },
        contracts: {
            multicall3: network?.metadata?.contracts?.multicall3
        },
    }
}