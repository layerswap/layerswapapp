import { Layer } from "../Models/Layer"
import useEVMTracking from "../lib/transactionTracking/evm/useEVMTracking"

export default function useTransactionTracking() {

    const TrackingProviders = [
        useEVMTracking()
    ]

    const getTrackingProvider = (network: Layer) => {
        const provider = TrackingProviders.find(provider => provider.supportedNetworks.includes(network.internal_name))
        return provider
    }

    return {
        getTrackingProvider
    }
}
