import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware';

interface ContractStatus {
    address: string;
    network: string;
    isContract: boolean;
}

interface ContractAddressState {
    contractStatuses: ContractStatus[];
    setContractStatus: (address: string, network: string, isContract: boolean) => void;
    isContractInNetwork: (address: string, network: string) => boolean;
    isContractInAnyNetwork: (address: string) => boolean;
    getContractNetworks: (address: string) => string[];
    clearContractStatus: (address: string, network?: string) => void;
}

export const useContractAddressStore = create<ContractAddressState>()(
    persist(
        (set, get) => ({
            contractStatuses: [],
            
            setContractStatus: (address: string, network: string, isContract: boolean) =>
                set((state) => {
                    const existingIndex = state.contractStatuses.findIndex(
                        (cs) => cs.address.toLowerCase() === address.toLowerCase() && 
                                cs.network === network
                    );
                    
                    if (existingIndex >= 0) {
                        // Update existing status
                        const updated = [...state.contractStatuses];
                        updated[existingIndex] = { address, network, isContract };
                        return { contractStatuses: updated };
                    } else {
                        // Add new status
                        return {
                            contractStatuses: [
                                ...state.contractStatuses,
                                { address, network, isContract }
                            ]
                        };
                    }
                }),
            
            isContractInNetwork: (address: string, network: string) => {
                const status = get().contractStatuses.find(
                    (cs) => cs.address.toLowerCase() === address.toLowerCase() && 
                            cs.network === network
                );
                return status?.isContract ?? false;
            },
            
            isContractInAnyNetwork: (address: string) => {
                return get().contractStatuses.some(
                    (cs) => cs.address.toLowerCase() === address.toLowerCase() && 
                            cs.isContract === true
                );
            },
            
            getContractNetworks: (address: string) => {
                return get().contractStatuses
                    .filter(
                        (cs) => cs.address.toLowerCase() === address.toLowerCase() && 
                                cs.isContract === true
                    )
                    .map((cs) => cs.network);
            },
            
            clearContractStatus: (address: string, network?: string) =>
                set((state) => {
                    if (network) {
                        // Clear specific address+network combination
                        return {
                            contractStatuses: state.contractStatuses.filter(
                                (cs) => !(cs.address.toLowerCase() === address.toLowerCase() && 
                                         cs.network === network)
                            )
                        };
                    } else {
                        // Clear all networks for this address
                        return {
                            contractStatuses: state.contractStatuses.filter(
                                (cs) => cs.address.toLowerCase() !== address.toLowerCase()
                            )
                        };
                    }
                }),
        }),
        {
            name: 'contractAddress',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

