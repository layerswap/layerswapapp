import { useConnectModal } from "@rainbow-me/rainbowkit"
import { disconnect } from '@wagmi/core'
import { useAccount } from "wagmi"
import { NetworkType } from "../../../Models/CryptoNetwork"
import { useSettingsState } from "../../../context/settings"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"


export default function useEVM(): WalletProvider {
    const { layers } = useSettingsState()
    const SupportedNetworks = [...layers.filter(layer => layer.type === NetworkType.EVM).map(l => l.internal_name), KnownInternalNames.Networks.ZksyncMainnet]
    const name = 'evm'
    const account = useAccount()
    const { openConnectModal } = useConnectModal()

    const getWallet = () => {
        if (account && account.address && account.connector) {
            return {
                address: account.address,
                connector: account.connector?.id,
                providerName: name,
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
        getConnectedWallet: getWallet,
        connectWallet,
        disconnectWallet,
        SupportedNetworks,
        name
    }
}