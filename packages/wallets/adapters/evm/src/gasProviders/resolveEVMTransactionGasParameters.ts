import { Network } from "@layerswap/widget-types";
import { createPublicClient } from "viem";
import resolveChain from "../evmUtils/resolveChain";
import { resolveFallbackTransport } from "../evmUtils/resolveTransports";
import { buildTransactionGasParameters } from "./evmGasMath";
import { resolveEVMGasPolicy } from "./evmGasPolicies";

type ResolveEVMTransactionGasParametersArgs = {
    network: Network
    account: `0x${string}`
    to: `0x${string}`
    data?: `0x${string}`
    value?: bigint
}

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
        transport: resolveFallbackTransport(network.nodes),
    })

    const [estimatedGas, feesPerGas] = await Promise.all([
        publicClient.estimateGas({ account, to, data, value }),
        publicClient.estimateFeesPerGas(),
    ])

    const { maxFeePerGas, maxPriorityFeePerGas } = feesPerGas
    if (maxFeePerGas === undefined || maxPriorityFeePerGas === undefined) {
        throw new Error(`EIP-1559 fee data is unavailable for chain ${chainId}`)
    }

    return buildTransactionGasParameters({
        policy,
        estimatedGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
    })
}
