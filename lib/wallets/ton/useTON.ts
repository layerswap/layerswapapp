import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react"
import { Address } from "@ton/core";
import KnownInternalNames from "../../knownIds";
import { WalletProvider } from "../../../hooks/useWallet";
import TON from "../../../components/icons/Wallets/TON";

export default function useTON(): WalletProvider {
    const withdrawalSupportedNetworks = [KnownInternalNames.Networks.TONMainnet]
    const name = 'TON'
    const id = 'ton'
    const tonWallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    const wallet = tonWallet ? {
        address: Address.parse(tonWallet.account.address).toString({ bounceable: false }),
        connector: name,
        providerName: id,
        isActive: true,
        icon: TON,
        disconnect: () => disconnectWallet(),
        connect: () => connectWallet(),
    } : undefined

    const getWallet = () => {
        if (wallet) {
            return [wallet]
        }
        return undefined
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
        connectedWallets: getWallet(),
        activeWallet: wallet,
        connectWallet,
        disconnectWallets: disconnectWallet,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks: withdrawalSupportedNetworks,
        asSourceSupportedNetworks: withdrawalSupportedNetworks,
        name,
        id,
    }
}