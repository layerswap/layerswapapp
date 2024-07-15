import toast from "react-hot-toast"
import { Network, RouteNetwork } from "../Models/Network"
import useEVMNew from "../lib/wallets/evm/useEvmNew";


type Wallet = {
    address: string | `0x${string}`;
    name: string;
    icon: (props: any) => React.JSX.Element;
    chainId?: string | number;
    disconnect: () => Promise<void> | undefined | void;
}


export type NewWalletProvider = {
    connectWallet: (props?: { chain?: string | number | undefined | null, destination?: RouteNetwork }) => Promise<void> | undefined | void,
    disconnectWallet: () => Promise<void> | undefined | void,
    reconnectWallet: (props?: { chain?: string | number | undefined | null }) => Promise<void> | undefined | void,
    getConnectedWallets: () => Wallet[] | undefined,
    autofillSupportedNetworks?: string[],
    withdrawalSupportedNetworks: string[],
    name: string,
}


export default function useNewWallet(network: Network, purpose: "autofil" | "withdrawal") {

    const WalletProviders: NewWalletProvider[] = [
        useEVMNew(),
    ]
    const provider = resolveProvider(network, WalletProviders, purpose)

    //if available wallets count is 0, then connect function is undefined

    //implement provider available and connected wallets



    async function connectWallet(chain?: string | number | null) {
        try {
            await provider?.connectWallet({ chain })
        }
        catch (e) {
            toast.error("Couldn't connect the account")
        }
    }

    const disconnectWallet = async (providerName: string) => {
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
            const w = wallet.getConnectedWallets()
            connectedWallets = w && [...connectedWallets, ...w] || [...connectedWallets]
        })

        return connectedWallets
    }

    return {
        wallets: getConnectedWallets(),
        connectWallet,
        disconnectWallet,
    }
}


const resolveProvider = (network: Network, walletProviders: NewWalletProvider[], purpose: "autofil" | "withdrawal") => {
    switch (purpose) {
        case "autofil":
            return walletProviders.find(provider => provider.autofillSupportedNetworks?.includes(network.name))
        case "withdrawal":
            return walletProviders.find(provider => provider.withdrawalSupportedNetworks.includes(network.name))
    }
}