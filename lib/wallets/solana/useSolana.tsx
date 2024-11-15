import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import { useWallet } from "@solana/wallet-adapter-react"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon"
import { useWalletModal } from "../../../components/WalletProviders/SolanaProvider/useWalletModal"
import { Network } from "../../../Models/Network"

export default function useSolana(): WalletProvider {

    const withdrawalSupportedNetworks = [
        KnownInternalNames.Networks.SolanaMainnet,
        KnownInternalNames.Networks.SolanaDevnet,
        KnownInternalNames.Networks.EclipseTestnet,
        KnownInternalNames.Networks.EclipseMainnet
    ]

    const name = 'solana'
    const { publicKey, disconnect, wallet } = useWallet();
    const { setVisible } = useWalletModal();

    const getWallet = (network?: Network) => {

        if (network?.name.toLowerCase().startsWith('eclipse') && !(wallet?.adapter?.name.toLowerCase() === "backpack" || wallet?.adapter?.name.toLowerCase() === "nightly")) {
            return undefined
        }

        if (publicKey) {
            return {
                address: publicKey?.toBase58(),
                connector: wallet?.adapter?.name,
                providerName: name,
                icon: resolveWalletConnectorIcon({ connector: String(wallet?.adapter.name), address: publicKey?.toBase58(), iconUrl: wallet?.adapter?.icon }),
            }
        }
    }

    const connectWallet = ({ chain }: { chain?: string }) => {
        const network = chain?.toLowerCase().includes('eclipse') ? 'eclipse' : 'solana'
        return setVisible && setVisible({ show: true, network: network })
    }

    const disconnectWallet = async () => {
        try {
            await disconnect()
        }
        catch (e) {
            console.log(e)
        }
    }

    const reconnectWallet = async ({ chain }: { chain?: string }) => {
        await disconnectWallet()
        connectWallet({ chain })
    }

    return {
        getConnectedWallet: getWallet,
        connectWallet,
        disconnectWallet,
        reconnectWallet,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks: withdrawalSupportedNetworks,
        asSourceSupportedNetworks: withdrawalSupportedNetworks,
        name
    }
}