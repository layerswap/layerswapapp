import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import { ResolveSolanaWalletIcon } from "./resolveSolanaIcon"
import { useWallet } from "@solana/wallet-adapter-react"

export default function useSolana(): WalletProvider {
    const withdrawalSupportedNetworks = [KnownInternalNames.Networks.SolanaMainnet]
    const autofillSupportedNetworks = [KnownInternalNames.Networks.SolanaMainnet]
    const name = 'solana'
    const { publicKey, disconnect, wallet, wallets } = useWallet();
    const { setVisible } = useWalletModal();

    const getWallet = () => {
        if (publicKey) {
            return {
                address: publicKey?.toBase58(),
                connector: wallet?.adapter?.name,
                providerName: name,
                icon: ResolveSolanaWalletIcon({ connector: String(wallet?.adapter.name) })
            }
        }
    }

    const connectWallet = () => {
        return setVisible && setVisible(true)
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