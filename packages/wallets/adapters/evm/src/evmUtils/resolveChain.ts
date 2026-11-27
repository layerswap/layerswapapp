import { resolveEVMGasPolicy } from "../gasProviders/evmGasPolicies";
import { ErrorHandler, type LayerswapNetwork } from "@layerswap/widget-types";
import { defineChain } from "viem"

export default function resolveChain(network: LayerswapNetwork) {
    const blockExplorerUrl = network.transaction_explorer_template
        ? new URL(network.transaction_explorer_template).origin
        : null

    if (!network.token) {
        const error = new Error(`UI Settings error: could not find native currency for ${network.name} ${JSON.stringify(network)} %0A`)
        ErrorHandler({
            type: "ChainError",
            message: error.message,
            name: error.name,
            stack: error.stack,
            cause: error.cause,
        })
        return
    }

    const chain = defineChain({
        id: Number(network.chain_id),
        name: network.display_name,
        nativeCurrency: {
            name: network.token.asset,
            symbol: network.token.asset,
            decimals: network.token.decimals,
        },
        rpcUrls: {
            default: { http: [...(network.nodes?.length ? network.nodes : [network.node_url])] },
            public: { http: [...(network.nodes?.length ? network.nodes : [network.node_url])] },
        },
        ...(blockExplorerUrl ? {
            blockExplorers: {
                default: {
                    name: "name",
                    url: blockExplorerUrl,
                },
            },
        } : {}),
        contracts: {
            ...(network.metadata?.evm_multicall_contract ? {
                multicall3: {
                    address: network.metadata?.evm_multicall_contract as `0x${string}`,
                },
            } : {}),
        },
    })

    const baseFeeMultiplier = resolveEVMGasPolicy(Number(network.chain_id)).baseFeeMultiplier
    if (baseFeeMultiplier) {
        chain.fees = {
            ...chain.fees,
            baseFeeMultiplier: () => baseFeeMultiplier,
        }
    }

    return chain
}
