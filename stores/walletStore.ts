import { create } from 'zustand'
import { AccountInterface } from 'starknet';
import { StarknetWindowObject } from 'starknetkit';
interface WalletState {
    connectedWallets: Wallet[];
    connectWallet: (wallet: Wallet) => void;
    disconnectWallet: (providerName: string) => void;
    selectedProveder?: string;
    selectProvider: (providerName: string) => void;
}

export type Wallet = {
    // TODO: might be unused and unnecessary check
    isActive: boolean;
    address: string | `0x${string}`;
    addresses: string[] | `0x${string}`[];
    providerName: string
    icon: (props: any) => React.JSX.Element;
    //TODO: this is name of the connector, should be changed to connectorId
    connector?: string;
    metadata?: {
        starknetAccount?: AccountInterface,
        wallet?: StarknetWindowObject
    }
    chainId?: string | number,
    isLoading?: boolean,
    disconnect: () => Promise<void> | undefined | void;
    connect: () => Promise<void> | undefined | void;
    isNotAvailable?: boolean;
}

export const useWalletStore = create<WalletState>()((set) => ({
    connectedWallets: [],
    selectProvider: (providerName) => set({ selectedProveder: providerName }),
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