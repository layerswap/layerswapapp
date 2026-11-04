import { ErrorHandler, type Network } from '@layerswap/widget-types'
import { parseGwei, type PublicClient } from 'viem'
import { resolveEVMGasPolicy } from './evmGasPolicies'

const resolveFeeEstimate = async <T>(type: 'GasPriceError' | 'FeesPerGasError' | 'MaxPriorityFeePerGasError', estimate: () => Promise<T>): Promise<T | undefined> => {
    try {
        return await estimate()
    } catch (cause) {
        const error = new Error(String(cause))
        error.cause = cause
        ErrorHandler({ type, message: error.message, name: error.name, stack: error.stack, cause })
    }
}

/** Shared RPC fallbacks and priority-fee floors for fee quotes and signed transactions. */
export const resolveEVMFeeData = async (publicClient: PublicClient, network: Network) => {
    const policy = resolveEVMGasPolicy(Number(network.chain_id))
    if (policy.transactionGasMode === 'explicit-legacy') {
        // Do not mix a legacy transaction's price with an unrelated EIP-1559 cap.
        // viem applies the policy's baseFeeMultiplier to this legacy price too.
        const fees = await resolveFeeEstimate('GasPriceError', () => publicClient.estimateFeesPerGas({ type: 'legacy', chain: publicClient.chain }))
        return { gasPrice: fees?.gasPrice, maxFeePerGas: undefined, maxPriorityFeePerGas: undefined }
    }

    const [gasPrice, feesPerGas] = await Promise.all([
        resolveFeeEstimate('GasPriceError', () => publicClient.getGasPrice()),
        resolveFeeEstimate('FeesPerGasError', () => publicClient.estimateFeesPerGas()),
    ])

    let maxPriorityFeePerGas = feesPerGas?.maxPriorityFeePerGas
    if (maxPriorityFeePerGas === undefined) {
        maxPriorityFeePerGas = await resolveFeeEstimate('MaxPriorityFeePerGasError', () => publicClient.estimateMaxPriorityFeePerGas())
    }
    let maxFeePerGas = feesPerGas?.maxFeePerGas
    const minPriorityFeeGwei = policy.minPriorityFeePerGasGwei
    if (minPriorityFeeGwei && maxPriorityFeePerGas !== undefined && maxFeePerGas !== undefined) {
        const minPriorityFee = parseGwei(minPriorityFeeGwei)
        if (maxPriorityFeePerGas < minPriorityFee) {
            maxFeePerGas += minPriorityFee - maxPriorityFeePerGas
            maxPriorityFeePerGas = minPriorityFee
        }
    }

    return { gasPrice, maxFeePerGas, maxPriorityFeePerGas }
}
