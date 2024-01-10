import { useWaitForTransaction } from "wagmi"
import { NetworkType } from "../../../Models/CryptoNetwork"
import { useSettingsState } from "../../../context/settings"
import { TransactionStatus, TxTrackingProvider } from "../../../hooks/useTransactionTracking"
import { Layer } from "../../../Models/Layer"

export default function useEVMTracking(hash: `0x${string}`, network: Layer): TxTrackingProvider {

    const { layers } = useSettingsState()
    const supportedNetworks = [
        ...layers.filter(layer => layer.type === NetworkType.EVM).map(l => l.internal_name),
    ]

    const transaction = useWaitForTransaction({
        chainId: (Number(network?.assets?.[0].network?.chain_id) || 0),
        hash: hash,
    })

    const statusResolver = (status: "success" | "error" | "idle" | "loading"): TransactionStatus => {
        switch (status) {
            case 'success':
                return 'completed'
            case 'error':
                return 'failed'
            case 'loading':
                return 'pending'
        }
    }

    return {
        status: statusResolver(transaction.status),
        supportedNetworks
    }
}