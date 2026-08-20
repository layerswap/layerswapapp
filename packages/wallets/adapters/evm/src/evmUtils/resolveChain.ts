import NetworkSettings from "../NetworkSettings";
import { ErrorHandler, type Network } from "@layerswap/widget-types";
import type { AppNetworkAdapter } from "@layerswap/utils"
import { defineChain } from "viem"

type ChainDefinitionInput = {
    id: number
    settingsId: string
    displayName: string
    nativeCurrency?: {
        symbol: string
        decimals: number
    }
    rpcUrls: readonly string[]
    transactionExplorerTemplate?: string
    multicallAddress?: string
    source: unknown
}

function resolveChainDefinition(input: ChainDefinitionInput) {
    const blockExplorerUrl = input.transactionExplorerTemplate
        ? new URL(input.transactionExplorerTemplate).origin
        : null

    if (!input.nativeCurrency) {
        const error = new Error(`UI Settings error: could not find native currency for ${input.settingsId} ${JSON.stringify(input.source)} %0A`)
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
        id: input.id,
        name: input.displayName,
        nativeCurrency: {
            name: input.nativeCurrency.symbol,
            symbol: input.nativeCurrency.symbol,
            decimals: input.nativeCurrency.decimals,
        },
        rpcUrls: {
            default: { http: [...input.rpcUrls] },
            public: { http: [...input.rpcUrls] },
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
            ...(input.multicallAddress ? {
                multicall3: {
                    address: input.multicallAddress as `0x${string}`,
                },
            } : {}),
        },
    })

    const baseFeeMultiplier = NetworkSettings.KnownSettings[input.settingsId]?.BaseFeeMultiplier ?? 1.2
    if (baseFeeMultiplier) {
        chain.fees = {
            ...chain.fees,
            baseFeeMultiplier: () => baseFeeMultiplier,
        }
    }

    return chain
}

export default function resolveChain(network: Network) {
    return resolveChainDefinition({
        id: Number(network.chain_id),
        settingsId: network.name,
        displayName: network.display_name,
        nativeCurrency: network.token,
        rpcUrls: network.nodes?.length > 0 ? network.nodes : [network.node_url],
        transactionExplorerTemplate: network.transaction_explorer_template,
        multicallAddress: network.metadata?.evm_multicall_contract ?? undefined,
        source: network,
    })
}

export function resolveAdapterChain<Network>(
    network: Network,
    networkAdapter: AppNetworkAdapter<Network>,
) {
    const rpcUrls = networkAdapter.getRpcUrls(network)
    if (rpcUrls.length === 0) return

    return resolveChainDefinition({
        id: Number(networkAdapter.getChainId(network)),
        settingsId: networkAdapter.getId(network),
        displayName: networkAdapter.getDisplayName(network),
        nativeCurrency: networkAdapter.getNativeCurrency(network),
        rpcUrls,
        transactionExplorerTemplate: networkAdapter.getTransactionExplorerUrl(network),
        multicallAddress: networkAdapter.getMulticallAddress?.(network),
        source: network,
    })
}
