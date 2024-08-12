import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import { useWallet } from "@solana/wallet-adapter-react"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon"
import { Wallet } from "../../../stores/walletStore"

export default function useSolana(): WalletProvider {
    const withdrawalSupportedNetworks = [KnownInternalNames.Networks.SolanaMainnet, KnownInternalNames.Networks.SolanaDevnet]

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
    } : undefined

    const getWallet = () => {
        if (wallet) {
            return [wallet]
        }
        return undefined
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

    const reconnectWallet = async () => {
        await disconnectWallet()
        connectWallet()
    }

    return {
        connectedWallets: getWallet(),
        activeWallet: wallet,
        connectWallet,
        disconnectWallets: disconnectWallet,
        reconnectWallet,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks: withdrawalSupportedNetworks,
        asSourceSupportedNetworks: withdrawalSupportedNetworks,
        name,
        id
    }
}