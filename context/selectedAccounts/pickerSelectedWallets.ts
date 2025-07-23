import { SwapDirection } from '@/components/DTOs/SwapFormValues'
import { AddressGroup } from '@/components/Input/Address/AddressPicker'
import { Wallet } from '@/Models/WalletProvider'
import { create } from 'zustand'

export interface SelectedWallet { wallet: Wallet | undefined, address: string | undefined, providerName: string | undefined, group?: AddressGroup, date?: string }

interface WalletStore {
    sourceWallets: SelectedWallet[] | undefined
    destWallets: SelectedWallet[] | undefined
    addSourceWallet: (wallet: SelectedWallet) => void
    addDestWallet: (wallet: SelectedWallet) => void
    sourceSelectedWallet: SelectedWallet | undefined
    addSourceSelectedWallet: (selectedWallet: SelectedWallet) => void
    reset: () => void
}

const _useSelectedWalletStore = create<WalletStore>((set) => ({
    sourceSelectedWallet: undefined,
    sourceWallets: undefined,
    destWallets: undefined,
    addSourceWallet: (selectedWallet) => set((state) => ({ sourceWallets: state.sourceWallets ? [...state.sourceWallets.filter(w => w.providerName !== selectedWallet.providerName), selectedWallet] : [selectedWallet] })),
    addDestWallet: (selectedWallet) => set((state) => ({ destWallets: state.destWallets ? [...state.destWallets.filter(w => w.providerName !== selectedWallet.providerName), selectedWallet] : [selectedWallet] })),
    addSourceSelectedWallet: (selectedWallet) => set(() => ({ sourceSelectedWallet: selectedWallet })),
    reset: () => set({ sourceWallets: undefined, destWallets: undefined }),
}))

function useSelectedWalletStore(direction: SwapDirection): {
    pickerSelectedWallets: SelectedWallet[] | undefined;
    addSelectedWallet: (wallet: SelectedWallet) => void;
};
function useSelectedWalletStore(direction: 'to'): {
    pickerSelectedWallets: SelectedWallet[] | undefined;
    addSelectedWallet: (wallet: SelectedWallet) => void;
};
function useSelectedWalletStore(direction: 'from'): {
    pickerSelectedWallets: SelectedWallet[] | undefined;
    pickerSelectedWallet: SelectedWallet | undefined
    addSelectedWallet: (wallet: SelectedWallet) => void;
    setSelectedSrcWallet: (selectedWallet: SelectedWallet | undefined) => void;
};
function useSelectedWalletStore(direction: SwapDirection) {
    const pickerSelectedWallets = _useSelectedWalletStore(state =>
        direction === 'from' ? state.sourceWallets : state.destWallets
    );

    const pickerSelectedSrcWallet = _useSelectedWalletStore(state => state.sourceSelectedWallet);

    const addSelectedWallet = _useSelectedWalletStore(state =>
        direction === 'from' ? state.addSourceWallet : state.addDestWallet
    );

    const setSelectedSrcWallet = _useSelectedWalletStore(state => state.addSourceSelectedWallet);


    if (direction == 'from') {
        return { pickerSelectedWallet: pickerSelectedSrcWallet, pickerSelectedWallets, addSelectedWallet, setSelectedSrcWallet }
    }

    return { pickerSelectedWallets, addSelectedWallet };
}

export default useSelectedWalletStore