import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react"
import { Address } from "@ton/core";
import KnownInternalNames from "../../knownIds";
import TON from "../../../components/icons/Wallets/TON";
import { WalletProvider } from "../../../Models/WalletProvider";

export default function useTON(): WalletProvider {
    const withdrawalSupportedNetworks = [KnownInternalNames.Networks.TONMainnet]
    const name = 'TON'
    const id = 'ton'
    const tonWallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    const address = tonWallet?.account && Address.parse(tonWallet.account.address).toString({ bounceable: false })
    const iconUrl = (tonWallet as any)?.imageUrl

    const wallet = tonWallet && address ? {
        addresses: [address],
        address,
        iconUrl,
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

    const connectWallet = async () => {
        return await tonConnectUI.openModal()
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
        activeAccountAddress: wallet?.address,
        switchAccount: async () => { },
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