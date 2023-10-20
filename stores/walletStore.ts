import { AccountInterface } from 'starknet';
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Layer } from '../Models/Layer';

interface WalletState {
    connectedWallets: { [network: string]: Wallet }
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

export const useWalletStore = create<WalletState>()(persist((set) => ({
    connectedWallets: {},
    connectWallet: (wallet) => set((state) => ({
        connectedWallets: {
            ...state.connectedWallets,
            [wallet.network.internal_name]: wallet
        }
    })),
    disconnectWallet: (network) => set((state) => {
        delete state?.connectedWallets?.[network.internal_name]
        return {
            connectedWallets: {
                ...state.connectedWallets
            }
        }
    })
}),
    {
        name: 'connected-wallets',
    }
))