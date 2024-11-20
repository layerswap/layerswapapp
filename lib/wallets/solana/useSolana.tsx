import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import { useWallet } from "@solana/wallet-adapter-react"
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon"
import { Wallet } from "../../../stores/walletStore"
import { useWalletModal } from "../../../components/WalletProviders/SolanaProvider/useWalletModal"
import { Network } from "../../../Models/Network"

export default function useSolana({ network }: { network: Network | undefined }): WalletProvider {

    const withdrawalSupportedNetworks = [
        KnownInternalNames.Networks.SolanaMainnet,
        KnownInternalNames.Networks.SolanaDevnet,
        KnownInternalNames.Networks.EclipseTestnet,
        KnownInternalNames.Networks.EclipseMainnet
    ]

    const name = 'Solana'
    const id = 'solana'
    const { publicKey, disconnect, wallet: solanaWallet } = useWallet();
    const { setVisible } = useWalletModal();

    const wallet: Wallet | undefined = publicKey ? {
        address: publicKey.toBase58(),
        connector: solanaWallet?.adapter?.name,
        providerName: name,
        icon: resolveWalletConnectorIcon({ connector: String(solanaWallet?.adapter.name), address: publicKey?.toBase58() }),
        disconnect,
        connect: () => connectWallet(),
        isActive: true,
        addresses: [publicKey.toBase58()]
    } : undefined

    const getWallet = () => {

        if (wallet) {
            if (network?.name.toLowerCase().startsWith('eclipse') && !(solanaWallet?.adapter?.name.toLowerCase() === "backpack" || solanaWallet?.adapter?.name.toLowerCase() === "nightly")) {
                return undefined
            }

            return [wallet]
        }
        return undefined
    }

    const connectWallet = () => {
        const solNetwork = network?.name?.toLowerCase().includes('eclipse') ? 'eclipse' : 'solana'
        return setVisible && setVisible({ show: true, network: solNetwork })
    }

    const disconnectWallet = async () => {
        try {
            await disconnect()
        }
        catch (e) {
            console.log(e)
        }
    }

    const provider = {
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

    return provider
}