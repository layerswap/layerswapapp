import { AccountInterface } from 'starknet';
import { create } from 'zustand'
import { Layer } from '../Models/Layer';

interface WalletState {
    connectedWallets: Wallet[];
    connectWallet: (wallet: Wallet) => void;
    disconnectWallet: (network: Layer) => void;
}

type Wallet = {
    address: string | `0x${string}`;
    chainId: number | string
    isConnected: boolean;
    network: Layer,
    icon?: string;
    connector?: string;
    metadata?: {
        starknetAccount?: AccountInterface
    }
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