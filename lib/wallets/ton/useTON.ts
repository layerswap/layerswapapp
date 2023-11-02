import { Layer } from "../../../Models/Layer"
import { NetworkType } from "../../../Models/CryptoNetwork"
import { useSettingsState } from "../../../context/settings"
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react"
import { Address } from "@ton/core";
import KnownInternalNames from "../../knownIds";
import { Wallet } from "../../../stores/walletStore";
import { WalletProvider } from "../../../hooks/useWallet";


export default function useTON(): WalletProvider {
    const SupportedNetworks = [KnownInternalNames.Networks.TONMainnet]

    const { layers } = useSettingsState()
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    const getWallet = () => {
        if (wallet && wallet.account.address && wallet.provider) {
            const w: Wallet = {
                address: Address.parse(wallet.account.address).toString({ bounceable: false }),
                connector: 'TON',
                network: layers.find(l => l.type === NetworkType.TON) as Layer
            }
            return w
        }
    }

    const connectWallet = () => {
        return tonConnectUI.openModal()
    }

    const disconnectWallet = async () => {
        try {
            await tonConnectUI.disconnect()
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