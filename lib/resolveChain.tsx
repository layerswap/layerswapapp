import { Chain, parseGwei } from "viem";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import NetworkSettings from "./NetworkSettings";

export default function resolveChain (network: CryptoNetwork): Chain {

    const nativeCurrency = network.currencies.find(c => c.asset === network.native_currency);
    const blockExplorersBaseURL = new URL(network.transaction_explorer_template).origin;

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
        blockExplorers: {
            default: {
                name: 'name',
                url: blockExplorersBaseURL,
            },
        },
        contracts: {
            multicall3: network?.metadata?.contracts?.multicall3
        },
        fees: {
            defaultPriorityFee: () => parseGwei(NetworkSettings.KnownSettings[network.internal_name].DefaultPriorityFee.toString()),
        }
    }
}