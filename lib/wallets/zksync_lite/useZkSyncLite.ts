import { Layer } from "../../../Models/Layer"
import { WalletProvider } from "../../../hooks/useWallet";
import { useWalletStore } from "../../../stores/walletStore"
import KnownInternalNames from "../../knownIds"
import { disconnect } from '@wagmi/core'
import { useEthersSigner } from "../../ethersToViem/ethers";
import * as zksync from 'zksync';
import useEVM from "../evm/useEVM";
import { useSettingsState } from "../../../context/settings";
import { NetworkType } from "../../../Models/CryptoNetwork";


export default function useZkSyncLite(): WalletProvider {

    const SupportedNetworks = [KnownInternalNames.Networks.ZksyncMainnet]

    const { connectWallet: connecEVMWallet } = useEVM()
    const { layers } = useSettingsState()
    const signer = useEthersSigner();
    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const getWallet = () => {
        return wallets.find(wallet => SupportedNetworks.includes(wallet.network.internal_name))
    }

    const connectWallet = async (network: Layer) => {
        const defaultProvider = network.internal_name?.split('_')?.[1]?.toLowerCase() == "mainnet" ? "mainnet" : "goerli";
        const evm = layers.find(l => l.type === NetworkType.EVM)

        if (!signer) evm && await connecEVMWallet(evm)

        try {
            if (signer) {
                const syncProvider = await zksync.getDefaultProvider(defaultProvider);
                const wallet = await zksync.Wallet.fromEthSigner(signer, syncProvider);
                addWallet({
                    address: wallet.address(),
                    network: network,
                    chainId: defaultProvider,
                    metadata: {
                        zkSyncAccount: wallet
                    }
                })
            }
        }
        catch (e) {
            throw new Error(e.message)
        }

    }


    const disconnectWallet = async (network: Layer) => {
        try {
            disconnect()
            removeWallet(network)
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