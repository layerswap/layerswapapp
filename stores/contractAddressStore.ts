import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware';
import { Network, NetworkType } from '@/Models/Network';
import resolveChain from '@/lib/resolveChain';
import { resolveFallbackTransport } from '@/lib/resolveTransports';
import { createPublicClient } from 'viem';

interface ContractStatus {
    address: string;
    network: string;
    isContract: boolean;
}

interface ConfirmedAddress {
    address: string;
    network: string;
}

export interface ContractCheckResult {
    sourceIsContract: boolean;
    destinationIsContract: boolean;
    isContractInAnyNetwork: boolean;
}

interface ContractAddressState {
    contractStatuses: ContractStatus[];
    confirmedAddresses: ConfirmedAddress[];
    isChecking: boolean;
    pendingChecks: Map<string, Promise<ContractCheckResult>>;
    checkContractStatus: (address: string, sourceNetwork: Network, destinationNetwork: Network) => Promise<ContractCheckResult>;
    hasStatus: (address: string, network: string) => boolean;
    isContractInNetwork: (address: string, network: string) => boolean;
    isContractInAnyNetwork: (address: string) => boolean;
    getContractNetworks: (address: string) => string[];
    clearContractStatus: (address: string, network?: string) => void;
    setConfirmed: (address: string, network: string) => void;
    isConfirmed: (address: string, network: string) => boolean;
    clearConfirmed: (address: string, network?: string) => void;
}

const isContractAddress = async (address: string, network: Network): Promise<boolean> => {
    if (!network || !address) {
        return false;
    }

    if (network.type != NetworkType.EVM) {
        return false;
    }

    try {
        const chain = resolveChain(network)
        const publicClient = createPublicClient({
            chain,
            transport: resolveFallbackTransport(network.nodes)
        })
        const bytecode = await publicClient.getCode({
            address: address as `0x${string}`
        });
        if (bytecode && bytecode !== '0x' && !bytecode.startsWith('0xef0100')) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.log(error)
        return false;
    }
}

export const useContractAddressStore = create<ContractAddressState>()(
    persist(
        (set, get) => ({
            contractStatuses: [],
            confirmedAddresses: [],
            isChecking: false,
            pendingChecks: new Map(),

            checkContractStatus: async (
                address: string,
                sourceNetwork: Network,
                destinationNetwork: Network
            ): Promise<ContractCheckResult> => {
                if (!address || !sourceNetwork || !destinationNetwork) {
                    return { sourceIsContract: false, destinationIsContract: false, isContractInAnyNetwork: false };
                }

                const { hasStatus, isContractInNetwork, isContractInAnyNetwork } = get();

                // Check if we already have cached results for both networks
                const hasSourceStatus = hasStatus(address, sourceNetwork.name);
                const hasDestStatus = hasStatus(address, destinationNetwork.name);

                if (hasSourceStatus && hasDestStatus) {
                    return {
                        sourceIsContract: isContractInNetwork(address, sourceNetwork.name),
                        destinationIsContract: isContractInNetwork(address, destinationNetwork.name),
                        isContractInAnyNetwork: isContractInAnyNetwork(address)
                    };
                }

                const checkKey = `${address.toLowerCase()}-${sourceNetwork.name}-${destinationNetwork.name}`;

                // If there's already a pending check for these params, return that promise
                const pendingCheck = get().pendingChecks.get(checkKey);
                if (pendingCheck) {
                    return pendingCheck;
                }

                set({ isChecking: true });

                const checkPromise = (async () => {
                    try {
                        // Check source network only if not already cached
                        let sourceIsContract = false;
                        if (hasSourceStatus) {
                            sourceIsContract = isContractInNetwork(address, sourceNetwork.name);
                        } else {
                            sourceIsContract = await isContractAddress(address, sourceNetwork);
                            set((state) => {
                                const existingIndex = state.contractStatuses.findIndex(
                                    (cs) => cs.address.toLowerCase() === address.toLowerCase() &&
                                        cs.network === sourceNetwork.name
                                );
                                if (existingIndex >= 0) {
                                    const updated = [...state.contractStatuses];
                                    updated[existingIndex] = { address, network: sourceNetwork.name, isContract: sourceIsContract };
                                    return { contractStatuses: updated };
                                }
                                return {
                                    contractStatuses: [...state.contractStatuses, { address, network: sourceNetwork.name, isContract: sourceIsContract }]
                                };
                            });
                        }

                        // Check destination network only if not already cached
                        let destinationIsContract = false;
                        if (hasDestStatus) {
                            destinationIsContract = isContractInNetwork(address, destinationNetwork.name);
                        } else {
                            destinationIsContract = await isContractAddress(address, destinationNetwork);
                            set((state) => {
                                const existingIndex = state.contractStatuses.findIndex(
                                    (cs) => cs.address.toLowerCase() === address.toLowerCase() &&
                                        cs.network === destinationNetwork.name
                                );
                                if (existingIndex >= 0) {
                                    const updated = [...state.contractStatuses];
                                    updated[existingIndex] = { address, network: destinationNetwork.name, isContract: destinationIsContract };
                                    return { contractStatuses: updated };
                                }
                                return {
                                    contractStatuses: [...state.contractStatuses, { address, network: destinationNetwork.name, isContract: destinationIsContract }]
                                };
                            });
                        }

                        // Check if contract in any network after updates
                        const isInAnyNetwork = get().isContractInAnyNetwork(address);

                        return { sourceIsContract, destinationIsContract, isContractInAnyNetwork: isInAnyNetwork };
                    } catch (error) {
                        console.error('Error checking contract status:', error);
                        return { sourceIsContract: false, destinationIsContract: false, isContractInAnyNetwork: false };
                    } finally {
                        set((state) => {
                            const newPendingChecks = new Map(state.pendingChecks);
                            newPendingChecks.delete(checkKey);
                            return { pendingChecks: newPendingChecks, isChecking: false };
                        });
                    }
                })();

                set((state) => {
                    const newPendingChecks = new Map(state.pendingChecks);
                    newPendingChecks.set(checkKey, checkPromise);
                    return { pendingChecks: newPendingChecks };
                });

                return checkPromise;
            },

            hasStatus: (address: string, network: string) => {
                return get().contractStatuses.some(
                    (cs) => cs.address.toLowerCase() === address.toLowerCase() &&
                        cs.network === network
                );
            },

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
                        return {
                            contractStatuses: state.contractStatuses.filter(
                                (cs) => !(cs.address.toLowerCase() === address.toLowerCase() &&
                                    cs.network === network)
                            )
                        };
                    } else {
                        return {
                            contractStatuses: state.contractStatuses.filter(
                                (cs) => cs.address.toLowerCase() !== address.toLowerCase()
                            )
                        };
                    }
                }),

            setConfirmed: (address: string, network: string) =>
                set((state) => {
                    const exists = state.confirmedAddresses.some(
                        (ca) => ca.address.toLowerCase() === address.toLowerCase() &&
                            ca.network === network
                    );

                    if (exists) {
                        return state;
                    }

                    return {
                        confirmedAddresses: [
                            ...state.confirmedAddresses,
                            { address, network }
                        ]
                    };
                }),

            isConfirmed: (address: string, network: string) => {
                return get().confirmedAddresses.some(
                    (ca) => ca.address.toLowerCase() === address.toLowerCase() &&
                        ca.network === network
                );
            },

            clearConfirmed: (address: string, network?: string) =>
                set((state) => {
                    if (network) {
                        return {
                            confirmedAddresses: state.confirmedAddresses.filter(
                                (ca) => !(ca.address.toLowerCase() === address.toLowerCase() &&
                                    ca.network === network)
                            )
                        };
                    } else {
                        return {
                            confirmedAddresses: state.confirmedAddresses.filter(
                                (ca) => ca.address.toLowerCase() !== address.toLowerCase()
                            )
                        };
                    }
                }),
        }),
        {
            name: 'contractAddress',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                contractStatuses: state.contractStatuses,
                confirmedAddresses: state.confirmedAddresses,
            }),
        }
    )
);

