import { Network } from "@layerswap/widget-types";
import { BaseError, createPublicClient, InsufficientFundsError } from "viem";
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

    const gasParameters = buildTransactionGasParameters({
        policy,
        chainId,
        estimatedGas,
        ...feesPerGas,
    })

    if (!gasParameters || !policy.checkBalanceBeforeSend) {
        return gasParameters
    }

    // Validate the exact payload using the fees passed to the wallet. Never
    // silently reduce a deposit amount: it belongs to an already-created swap.
    // Pending balance also accounts for transactions not yet mined.
    const balance = await publicClient.getBalance({ address: account, blockTag: 'pending' })
    const feePerGas = gasParameters.gasPrice ?? gasParameters.maxFeePerGas
    if (feePerGas === undefined) {
        throw new Error(`Transaction fee is unavailable for chain ${chainId}`)
    }
    const requiredBalance = (value ?? 0n) + gasParameters.gas * feePerGas
    if (balance < requiredBalance) {
        throw new InsufficientFundsError({
            cause: new BaseError(
                'Balance does not cover the transfer and its current maximum gas fee. Recalculate the amount before sending.',
            ),
        })
    }

    return gasParameters
}
