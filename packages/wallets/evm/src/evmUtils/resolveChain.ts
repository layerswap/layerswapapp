import { defineChain, parseGwei } from "viem";
import { Network } from "@layerswap/widget/types";
import { ErrorHandler, NetworkSettings } from "@layerswap/widget/internal";

export default function resolveChain(network: Network) {

    const nativeCurrency = network.token;
    const blockExplorersBaseURL =
        network.transaction_explorer_template ?
            new URL(network.transaction_explorer_template).origin
            : null

    const metadata = network.metadata
    const { evm_multicall_contract } = metadata || {}

    if (!nativeCurrency) {
        const error = new Error(`UI Settings error: could not find native currency for ${network.name} ${JSON.stringify(network)} %0A`);
        ErrorHandler({
            type: "ChainError",
            message: error.message,
            name: error.name,
            stack: error.stack,
            cause: error.cause
        })
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

    const baseFeeMultiplier = NetworkSettings.KnownSettings[network.name]?.BaseFeeMultiplier ?? 1.2

    if (baseFeeMultiplier) {
        res.fees = {
            ...res.fees,
            baseFeeMultiplier: () => {
                return baseFeeMultiplier
            },
        }
    }
    return res
}
