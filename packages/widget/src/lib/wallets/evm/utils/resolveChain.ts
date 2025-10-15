import { defineChain, parseGwei } from "viem";
import { Network } from "@/types";
import NetworkSettings from "@/lib/NetworkSettings";
import logError from "@/lib/logError";

export default function resolveChain(network: Network) {

    const nativeCurrency = network.token;
    const blockExplorersBaseURL =
        network.transaction_explorer_template ?
            new URL(network.transaction_explorer_template).origin
            : null

    const metadata = network.metadata
    const { evm_multicall_contract } = metadata || {}

    if (!nativeCurrency) {
        logError(`UI Settings error: could not find native currency for ${network.name} ${JSON.stringify(network)} %0A`)
        return
    }

    const res = defineChain({
        id: Number(network.chain_id),
        name: network.display_name,
        nativeCurrency: {
            name: nativeCurrency.symbol,
            symbol: nativeCurrency.symbol,
            decimals: nativeCurrency.decimals
        },
        rpcUrls: {
            default: {
                http: [network.node_url],
            },
            public: {
                http: [network.node_url],
            },
        },
        ...(blockExplorersBaseURL ? {
            blockExplorers: {
                default: {
                    name: 'name',
                    url: blockExplorersBaseURL,
                },
            }
        } : {}),
        contracts: {
            ...(evm_multicall_contract ? {
                multicall3: {
                    address: evm_multicall_contract as `0x${string}`
                }
            } : {}),
        },
    })

    const defaultPriorityFee = NetworkSettings.KnownSettings[network.name]?.DefaultPriorityFee?.toString()
    const baseFeeMultiplier = NetworkSettings.KnownSettings[network.name]?.BaseFeeMultiplier ?? 1.2

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
