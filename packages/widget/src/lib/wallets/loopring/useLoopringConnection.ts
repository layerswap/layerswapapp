import { useMemo } from "react"
import { WalletConnectionProvider } from "@/types/wallet"
import useEVMConnection from "../evm/useEVMConnection"
import KnownInternalNames from "@/lib/knownIds"
import { default as LoopringMultiStepHandler } from "./components/LoopringMultiStepHandler"

export default function useLoopringConnection(): WalletConnectionProvider {
    const name = 'Loopring'
    const id = 'loopring'
    
    const evmProvider = useEVMConnection()

    const withdrawalSupportedNetworks = useMemo(() => [
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringGoerli,
        KnownInternalNames.Networks.LoopringSepolia
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
        MultiStepHandler: LoopringMultiStepHandler,
    }), [evmProvider, withdrawalSupportedNetworks, autofillSupportedNetworks, asSourceSupportedNetworks, name, id])

    return provider
}

