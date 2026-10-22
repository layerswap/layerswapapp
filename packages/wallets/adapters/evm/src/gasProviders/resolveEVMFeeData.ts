import { ErrorHandler, type Network } from '@layerswap/widget-types'
import { parseGwei, type PublicClient } from 'viem'
import NetworkSettings from '../NetworkSettings'

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
    const [gasPrice, feesPerGas] = await Promise.all([
        resolveFeeEstimate('GasPriceError', () => publicClient.getGasPrice()),
        resolveFeeEstimate('FeesPerGasError', () => publicClient.estimateFeesPerGas()),
    ])

    let maxPriorityFeePerGas = feesPerGas?.maxPriorityFeePerGas
    if (maxPriorityFeePerGas === undefined) {
        maxPriorityFeePerGas = await resolveFeeEstimate('MaxPriorityFeePerGasError', () => publicClient.estimateMaxPriorityFeePerGas())
    }
    let maxFeePerGas = feesPerGas?.maxFeePerGas
    const minPriorityFeeGwei = NetworkSettings.KnownSettings[network.name]?.MinPriorityFeePerGasInGwei
    if (minPriorityFeeGwei && maxPriorityFeePerGas !== undefined && maxFeePerGas !== undefined) {
        const minPriorityFee = parseGwei(minPriorityFeeGwei.toString())
        if (maxPriorityFeePerGas < minPriorityFee) {
            maxFeePerGas += minPriorityFee - maxPriorityFeePerGas
            maxPriorityFeePerGas = minPriorityFee
        }
    }

    return { gasPrice, maxFeePerGas, maxPriorityFeePerGas }
}
