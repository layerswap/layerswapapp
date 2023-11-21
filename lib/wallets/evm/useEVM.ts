import { useConnectModal } from "@rainbow-me/rainbowkit"
import { disconnect } from '@wagmi/core'
import { useAccount } from "wagmi"
import { NetworkType } from "../../../Models/CryptoNetwork"
import { useSettingsState } from "../../../context/settings"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import { ResolveEVMWalletIcon } from "./resolveEVMIcon"
import { useRainbowKitUpdate } from "../../../components/RainbowKit"

export default function useEVM(): WalletProvider {
    const { layers } = useSettingsState()
    const { setInitialChain } = useRainbowKitUpdate()

    const withdrawalSupportedNetworks = [...layers.filter(layer => layer.type === NetworkType.EVM).map(l => l.internal_name), KnownInternalNames.Networks.ZksyncMainnet]
    const autofillSupportedNetworks = [...withdrawalSupportedNetworks, KnownInternalNames.Networks.ImmutableXMainnet, KnownInternalNames.Networks.ImmutableXGoerli]
    const requiredChainsForConnect = [KnownInternalNames.Networks.ZksyncEraMainnet]
    const name = 'evm'
    const account = useAccount()
    const { openConnectModal } = useConnectModal()

    const getWallet = () => {
        if (account && account.address && account.connector) {
            return {
                address: account.address,
                connector: account.connector?.id,
                providerName: name,
                icon: ResolveEVMWalletIcon({ connector: account.connector?.id })
            }
        }
    }

    const connectWallet = (chain: number) => {
        const network = layers.find(l => l.isExchange !== true && Number(l.chain_id) == chain)
        if (network && requiredChainsForConnect.includes(network?.internal_name)) setInitialChain(chain)
        else setInitialChain(undefined)

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
        autofillSupportedNetworks,
        withdrawalSupportedNetworks,
        name
    }
}