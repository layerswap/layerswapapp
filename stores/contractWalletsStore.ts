import { create } from 'zustand'
import resolveChain from '../lib/resolveChain';
import { createPublicClient, http } from 'viem';
import { CryptoNetwork, NetworkType } from '../Models/CryptoNetwork';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WalletState {
    contractWallets: Wallet[];
    checkContractWallet: (address: string, network: CryptoNetwork) => void;
}

export type Wallet = {
    address: string,
    ready: boolean
}

export const useContractWalletsStore = create<WalletState>()(persist((set) => ({
    contractWallets: [],
    checkContractWallet: (address, network) => set((state) => {

        if (state.contractWallets.some(w => w.address === address)) {
            return ({
                contractWallets: [...state.contractWallets]
            })
        }
        else {
            (async () => {
                if (address && network.type == NetworkType.EVM) {
                    const chain = resolveChain(network)

                    const publicClient = createPublicClient({
                        chain,
                        transport: http()
                    })

                    const bytecode = await publicClient.getBytecode({
                        address: address as `0x${string}`
                    });

                    const isContractWallet = !!bytecode

                    if (isContractWallet) {
                        return ({
                            contractWallets: [
                                ...state.contractWallets.filter(w => w.address !== address),
                                { address: address, ready: true }
                            ]
                        })
                    }
                }
            })()
        }

        return ({
            contractWallets: [...state.contractWallets]
        })

    }),
}),
    {
        name: 'contractWallets',
        storage: createJSONStorage(() => localStorage),
    }
))