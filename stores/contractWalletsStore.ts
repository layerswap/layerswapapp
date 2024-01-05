import { create } from 'zustand'
import resolveChain from '../lib/resolveChain';
import { createPublicClient, http } from 'viem';
import { CryptoNetwork, NetworkType } from '../Models/CryptoNetwork';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WalletState {
    contractWallets: ContractWalletStorage[];
    addContractWallet: (address: string, network_internal_name: string, isContractWallet: boolean) => void;
}

export type ContractWalletStorage = {
    address?: string,
    isContract?: boolean
    network?: string
}

export const useContractWalletsStore = create<WalletState>()(persist((set) => ({
    contractWallets: [],
    addContractWallet: (address, network_internal_name, isContractWallet) =>
        set((state) => {
            return ({
                contractWallets: [
                    ...state.contractWallets.filter(w => w.address !== address),
                    { address: address, isContract: isContractWallet, network: network_internal_name }
                ]
            })
        }),
    checkContractWallet: (address, network) => {
        if (!network) { throw new Error('Network is not provided') }
        (async () => {
            if (address && network.type == NetworkType.EVM) {
                let isContractWallet: boolean = false
                let isReady: boolean = false
                set((state) => {
                    if (state.contractWallets.some(w => w.address === address)) {
                        return ({
                            contractWallets: [...state.contractWallets]
                        })
                    }
                    else {
                        (async () => {
                            const chain = resolveChain(network)
                            const publicClient = createPublicClient({
                                chain,
                                transport: http()
                            })
                            try {
                                const bytecode = await publicClient.getBytecode({
                                    address: address as `0x${string}`
                                });
                                isContractWallet = !!bytecode
                                isReady = true;
                            } catch (error) {
                                console.log(error)
                            }
                        })()

                        return ({
                            contractWallets: [
                                ...state.contractWallets.filter(w => w.address !== address),
                                { address: address, ready: isReady, isContract: isContractWallet, network: network.internal_name }
                            ]
                        })
                    }
                })

                return { address: address, ready: isReady, value: isContractWallet, network: network.internal_name }
            }
        })()

        return { ready: true, isContract: false, network: network.internal_name }

    },
}),
    {
        name: 'contractWallets',
        storage: createJSONStorage(() => sessionStorage),
    }
))