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

/**
 * Prepare the explicit gas parameters a chain policy asks for. Whether the
 * account can fund them is the wallet's decision, never asserted here: smart
 * accounts and paymasters pay fees in tokens or have them sponsored, so the
 * native balance says nothing about affordability. L1 data and operator fees
 * are likewise charged by the chain and shown by the wallet, not pre-checked.
 */
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
