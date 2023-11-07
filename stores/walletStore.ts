import { create } from 'zustand'
import { StarknetWindowObject } from 'get-starknet-core';

interface WalletState {
    connectedWallets: Wallet[];
    connectWallet: (wallet: Wallet) => void;
    disconnectWallet: (providerName: string) => void;
}

export type Wallet = {
    address: string | `0x${string}`;
    providerName: string
    icon?: string;
    connector?: string;
    metadata?: {
        starknetAccount?: StarknetWindowObject,
    }
    chainId?: string | number
}

export const useWalletStore = create<WalletState>()((set) => ({
    connectedWallets: [],
    connectWallet: (wallet) => set((state) => ({
        connectedWallets: [
            ...state.connectedWallets,
            wallet
        ]
    })),
    disconnectWallet: (providerName) => set((state) => ({
        connectedWallets: state.connectedWallets.filter(w => w.providerName !== providerName)
    }))
}))