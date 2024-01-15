import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware';
import { Layer } from '../Models/Layer';

interface WalletState {
    contractWallets: ContractWalletInfo[];
    addContractWallet: (address: string, network_internal_name: string) => void;
    getContractWallet:  (address, network_internal_name) => ContractWalletInfo | undefined;
    updateContractWallet: (address, network_internal_name, isContractWallet) => void;
}

export class ContractWalletInfo {
    key: string; // address+network_internal_name
    isContract: boolean;
    ready: boolean;

    public static keyDeriver(address: string, network_internal_name: string) {
        return address + network_internal_name;
    }
}


export const useContractWalletsStore = create<WalletState>()(persist((set, get) => ({
    contractWallets: [],
    getContractWallet:  (address, network_internal_name) => {
        return get().contractWallets.find(x=> x.key == ContractWalletInfo.keyDeriver(address, network_internal_name))
    },
    addContractWallet: (address, network_internal_name) =>
        set((state) => {
            return ({
                contractWallets: [
                    ...state.contractWallets.filter(w => w.key != ContractWalletInfo.keyDeriver(address, network_internal_name)),
                    { key: ContractWalletInfo.keyDeriver(address, network_internal_name), ready: false, isContract: false }
                ]
            })
        }),
    updateContractWallet: (address, network_internal_name, isContractWallet) =>
        set((state) => ({
            contractWallets: [
                ...state.contractWallets.filter(w => w.key !== ContractWalletInfo.keyDeriver(address, network_internal_name)),
                { key: ContractWalletInfo.keyDeriver(address, network_internal_name), isContract: isContractWallet, ready: true }
            ]

        })),
}),
    {
        name: 'contractWallets',
        storage: createJSONStorage(() => sessionStorage),
    }
))