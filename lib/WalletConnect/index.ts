import { Layer } from "../../Models/Layer";
import { Wallet } from "../../stores/walletStore";
import useEVM from "./wallets/evm/useEVM";
import useImmutableX from "./wallets/immutableX/useIMX";
import useStarknet from "./wallets/starknet/useStarknet";
import useTON from "./wallets/ton/useTON";

export type WalletProvider = {
    connectWallet: () => Promise<void> | undefined | void,
    disconnectWallet: () => Promise<void> | undefined,
    getWallet: () => Wallet | undefined,
    SupportedNetworks: string[]
}

export default function useWalletProvider(network: Layer | undefined) {

    const WalletProviders = [
        useTON,
        useEVM,
        useStarknet,
        useImmutableX
    ]

    if (!network) return

    const Provider = WalletProviders.find(provider => provider().SupportedNetworks.includes(network.internal_name))

    if (!Provider) return

    const { SupportedNetworks, connectWallet, disconnectWallet, getWallet } = Provider()

    return {
        getWallet,
        connectWallet,
        disconnectWallet,
        SupportedNetworks
    }
}