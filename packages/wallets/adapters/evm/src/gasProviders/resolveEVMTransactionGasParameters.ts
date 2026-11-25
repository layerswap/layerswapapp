import { Network } from "@layerswap/widget-types";
import { createPublicClient } from "viem";
import resolveChain from "../evmUtils/resolveChain";
import { resolveFallbackTransport } from "../evmUtils/resolveTransports";
import { buildTransactionGasParameters } from "./evmGasMath";
import { resolveEVMGasPolicy } from "./evmGasPolicies";
import { resolveEVMFeeData } from "./resolveEVMFeeData";

type ResolveEVMTransactionGasParametersArgs = {
    network: Network
    account: `0x${string}`
    to: `0x${string}`
    data?: `0x${string}`
    value?: bigint
}

/** Funding is never checked here: smart accounts and paymasters may pay fees without native balance. */
export const resolveEVMTransactionGasParameters = async ({
    network,
    account,
    to,
    data,
    value,
}: ResolveEVMTransactionGasParametersArgs) => {
    const chainId = Number(network.chain_id)
    const policy = resolveEVMGasPolicy(chainId)
    if (policy.transactionGasMode === 'wallet') return undefined

    const publicClient = createPublicClient({
        chain: resolveChain(network),
        transport: resolveFallbackTransport(network.nodes?.length > 0 ? network.nodes : [network.node_url]),
    })

    const [estimatedGas, feesPerGas] = await Promise.all([
        publicClient.estimateGas({ account, to, data, value }),
        resolveEVMFeeData(publicClient, network),
    ])

    return buildTransactionGasParameters({
        policy,
        chainId,
        estimatedGas,
        ...feesPerGas,
    })
}
