import { Layer } from "../Models/Layer"
import useEVMTracking from "../lib/transactionTracking/evm/useEVMTracking"

export default function useTransactionTracking(hash: `0x${string}`, network: Layer) {

    const TrackingProviders = [
        useEVMTracking(hash, network)
    ]

    const getTransactionStatus = () => {
        const status = TrackingProviders.find(provider => provider.supportedNetworks.includes(network.internal_name))?.status
        return status
    }

    return {
        getTransactionStatus
    }
}

export type TxTrackingProvider = {
    supportedNetworks: string[],
    status: TransactionStatus
}

export type TransactionStatus = 'pending' | 'failed' | 'completed' | undefined