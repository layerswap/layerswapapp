import { create } from 'zustand'
import { Layer } from '../Models/Layer';
import { StarknetWindowObject } from 'get-starknet-core';
import * as zksync from 'zksync';

interface WalletState {
    connectedWallets: Wallet[];
    connectWallet: (wallet: Wallet) => void;
    disconnectWallet: (network: Layer) => void;
}

export type Wallet = {
    address: string | `0x${string}`;
    //TODO remove
    network: Layer,
    icon?: string;
    connector?: string;
    metadata?: {
        starknetAccount?: StarknetWindowObject,
        zkSyncAccount?: zksync.Wallet
    }
    chainId?: string | number
}

export const useWalletStore = create<WalletState>()((set) => ({
    connectedWallets: [],
    connectWallet: (wallet) => set((state) => ({
        connectedWallets: [
            ...state.connectedWallets.filter(w => w.network.internal_name !== wallet.network.internal_name),
            wallet
        ]
    })),
    disconnectWallet: (network) => set((state) => ({
        connectedWallets: state.connectedWallets.filter(w => w.network.internal_name !== network.internal_name)
    }))
}))