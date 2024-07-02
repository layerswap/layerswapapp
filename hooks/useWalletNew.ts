import toast from "react-hot-toast"
import useTON from "../lib/wallets/ton/useTON"
import useEVM from "../lib/wallets/evm/useEVM"
import useStarknet from "../lib/wallets/starknet/useStarknet"
import useImmutableX from "../lib/wallets/immutableX/useIMX"
import useSolana from "../lib/wallets/solana/useSolana"
import { Network } from "../Models/Network"


type Wallet = {
    address: string | `0x${string}`;
    name: string;
    icon: (props: any) => React.JSX.Element;
    chainId?: string | number;
    disconnect: () => Promise<void> | undefined | void;
}


export type WalletProvider = {
    

    connectWallet: ((chain?: string | number | undefined | null) => Promise<void> | undefined | void)

    disconnectWallet: () => Promise<void> | undefined | void,
    getConnectedWallet: () => Wallet | undefined,
    autofillSupportedNetworks?: string[],
    withdrawalSupportedNetworks: string[],
    name: string,

}


export default function useWallet(network: Network, purpose: "autofil" | "withdrawal") {

    const WalletProviders: WalletProvider[] = [
        useTON(),
        useEVM(),
        useStarknet(),
        useImmutableX(),
        useSolana()
    ]
    const provider = resolveProvider(network, WalletProviders, purpose)

    //if available wallets count is 0, then connect function is undefined

    //implement provider available and connected wallets
    
    

    async function handleConnect(chain?: string | number | null) {
        try {
            await provider?.connectWallet(chain)
        }
        catch (e) {
            toast.error("Couldn't connect the account")
        }
    }

    const handleDisconnect = async (providerName: string) => {
        try {
            await provider?.disconnectWallet()
        }
        catch (e) {
            toast.error("Couldn't disconnect the account")
        }
    }

    const getConnectedWallets = () => {
        let connectedWallets: Wallet[] = []

        WalletProviders.forEach(wallet => {
            const w = wallet.getConnectedWallet()
            connectedWallets = w && [...connectedWallets, w] || [...connectedWallets]
        })

        return connectedWallets
    }

    const getWithdrawalProvider = (network: Network) => {
        const provider = WalletProviders.find(provider => provider.withdrawalSupportedNetworks.includes(network.name))
        return provider
    }

    const getAutofillProvider = (network: Network) => {
        const provider = WalletProviders.find(provider => provider?.autofillSupportedNetworks?.includes(network.name))
        return provider
    }

    return {
        wallets: getConnectedWallets(),
        connectWallet: handleConnect,
        disconnectWallet: handleDisconnect,
        getWithdrawalProvider,
        getAutofillProvider,
    }
}


const resolveProvider = (network: Network, walletProviders: WalletProvider[], purpose: "autofil" | "withdrawal") => {
    switch (purpose) {
        case "autofil":
            return walletProviders.find(provider => provider.autofillSupportedNetworks?.includes(network.name))
        case "withdrawal":
            return walletProviders.find(provider => provider.withdrawalSupportedNetworks.includes(network.name))
    }
}