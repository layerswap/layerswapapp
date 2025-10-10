import { useMemo } from "react"
import { WalletConnectionProvider } from "@/types/wallet"
import useEVMConnection from "../evm/useEVMConnection"
import KnownInternalNames from "@/lib/knownIds"
import { default as ZkSyncMultiStepHandler } from "./components/ZkSyncMultiStepHandler"

export default function useZkSyncConnection(): WalletConnectionProvider {
    const name = 'ZkSync'
    const id = 'zksync'
    
    const evmProvider = useEVMConnection()

    const withdrawalSupportedNetworks = useMemo(() => [
        KnownInternalNames.Networks.ZksyncMainnet,
    ], [])

    const autofillSupportedNetworks = useMemo(() => [
        ...withdrawalSupportedNetworks
    ], [withdrawalSupportedNetworks])

    const asSourceSupportedNetworks = useMemo(() => [
        ...withdrawalSupportedNetworks
    ], [withdrawalSupportedNetworks])

    const provider: WalletConnectionProvider = useMemo(() => ({
        ...evmProvider,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks,
        asSourceSupportedNetworks,
        name,
        id,
        hideFromList: true,
        // Multi-step transfer configuration
        isMultiStepTransfer: true,
        MultiStepHandler: ZkSyncMultiStepHandler,
    }), [evmProvider, withdrawalSupportedNetworks, autofillSupportedNetworks, asSourceSupportedNetworks, name, id])

    return provider
}