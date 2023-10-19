import { Chain as rainbowChain } from "@rainbow-me/rainbowkit";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import NetworkSettings from "./NetworkSettings";
import { parseGwei, Chain } from "viem";

export default function resolveChain(network: CryptoNetwork): Chain {
    const nativeCurrency = network.currencies.find(c => c.asset === network.native_currency);
    const blockExplorersBaseURL = new URL(network.transaction_explorer_template).origin;

    const res: Chain & rainbowChain = {
        id: Number(network.chain_id),
        name: network.display_name,
        network: network.internal_name,
        iconUrl: network.img_url,
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
            multicall3: network?.metadata?.multicall3,
            ensRegistry: network?.metadata?.ensRegistry,
            ensUniversalResolver: network?.metadata?.ensUniversalResolver,
        },
    }

    const defaultPriorityFee = NetworkSettings.KnownSettings[network.internal_name]?.DefaultPriorityFee?.toString()
    const baseFeeMultiplier = NetworkSettings.KnownSettings[network.internal_name]?.BaseFeeMultiplier ?? 1.2

    if (defaultPriorityFee) {
        res.fees = {
            ...res.fees,
            defaultPriorityFee: () => parseGwei(defaultPriorityFee),
        }
    }
    if (baseFeeMultiplier) {
        res.fees = {
            ...res.fees,
            baseFeeMultiplier: () => baseFeeMultiplier
        }
    }
    return res
}