import { useConnectModal } from "@rainbow-me/rainbowkit"
import { Layer } from "../../../Models/Layer"
import { disconnect } from '@wagmi/core'
import { useAccount } from "wagmi"
import { NetworkType } from "../../../Models/CryptoNetwork"
import { useSettingsState } from "../../../context/settings"
import { WalletProvider } from "../../../hooks/useWallet"


export default function useEVM(): WalletProvider {
    const { layers } = useSettingsState()
    const SupportedNetworks = layers.filter(layer => layer.type === NetworkType.EVM).map(l => l.internal_name)
    
    const account = useAccount()
    const { openConnectModal } = useConnectModal()

    const getWallet = () => {
        if (account && account.address && account.connector) {
            return {
                address: account.address,
                connector: account.connector?.id,
                //TODO remove
                network: layers.find(l => l.type === NetworkType.EVM) as Layer
            }
        }
    }

    const connectWallet = () => {
        return openConnectModal && openConnectModal()
    }

    const disconnectWallet = async () => {
        try {
            await disconnect()
        }
        catch (e) {
            console.log(e)
        }
    }

    return {
        getWallet,
        connectWallet,
        disconnectWallet,
        SupportedNetworks
    }
}