import { NetworkType } from "../../../Models/CryptoNetwork"
import { useSettingsState } from "../../../context/settings"

export default function useEVMTracking() {

    const { layers } = useSettingsState()
    const supportedNetworks = [
        ...layers.filter(layer => layer.type === NetworkType.EVM).map(l => l.internal_name),
    ]

    const onSuccess = () => {

    }

    const onError = () => {

    }

    return {
        onSuccess,
        onError,
        supportedNetworks
    }
}
