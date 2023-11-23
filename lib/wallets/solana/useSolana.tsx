import { useConnectModal } from "@rainbow-me/rainbowkit"
import { disconnect } from '@wagmi/core'
import { useAccount } from "wagmi"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import { ResolveSolanaWalletIcon } from "./resolveSolanaIcon"
import { useWallet } from "@solana/wallet-adapter-react"

export default function useSolana(): WalletProvider {
    const withdrawalSupportedNetworks = [KnownInternalNames.Networks.SolanaMainnet]
    const autofillSupportedNetworks = [KnownInternalNames.Networks.SolanaMainnet]
    const name = 'solana'
    const { select, wallets, publicKey, disconnect, wallet, connect } = useWallet();
    const { openConnectModal } = useConnectModal()
debugger
    const getWallet = () => {
        if (publicKey) {
            return {
                address: `0x${wallet?.adapter.name}`,
                connector: wallet?.adapter.name,
                providerName: name,
                icon: ResolveSolanaWalletIcon({ connector: String(wallet?.adapter.name) })
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
        autofillSupportedNetworks,
        withdrawalSupportedNetworks,
        name
    }
}