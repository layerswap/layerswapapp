import { AccountInterface } from 'starknet';
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WalletState {
    connectedWallet: Wallet
    connectWallet: (wallet: Wallet) => void;
    disconnectWallet: () => void
}

type Wallet = {
    address: string;
    chainId: number | string
    isConnected: boolean;
    icon?: string;
    connector?: string;
    metadata?: {
        starknetAccount?: AccountInterface
    }
}

export const useWalletStore = create<WalletState>()(persist((set) => ({
    connectedWallet: null,
    connectWallet: (wallet) => set(() => ({ connectedWallet: wallet })),
    disconnectWallet: () => set(() => ({ connectedWallet: null }))
}),
    {
        name: 'connected-wallet',
    }
))