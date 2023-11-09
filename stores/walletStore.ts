import { create } from 'zustand'
import { StarknetWindowObject } from 'starknetkit';

interface WalletState {
    connectedWallets: Wallet[];
    connectWallet: (wallet: Wallet) => void;
    disconnectWallet: (providerName: string) => void;
}

export type Wallet = {
    address: string | `0x${string}`;
    providerName: string
    icon: (props: any) => React.JSX.Element;
    connector?: string;
    metadata?: {
        starknetAccount?: StarknetWindowObject,
    }
    chainId?: string | number
}

export const useWalletStore = create<WalletState>()((set) => ({
    connectedWallets: [],
    connectWallet: (wallet) => set((state) => {
        return ({
            connectedWallets: [
                ...state.connectedWallets.filter(w => w.providerName !== wallet.providerName),
                wallet
            ]
        })
    }),
    disconnectWallet: (providerName) => set((state) => ({
        connectedWallets: state.connectedWallets.filter(w => w.providerName !== providerName)
    }))
}))