import { create } from 'zustand'
import resolveChain from '../lib/resolveChain';
import { createPublicClient, http } from 'viem';
import { CryptoNetwork, NetworkType } from '../Models/CryptoNetwork';
import { createJSONStorage, persist } from 'zustand/middleware';
import KnownInternalNames from '../lib/knownIds';

interface WalletState {
    contractWallets: ContractWallet[];
    checkContractWallet: (address: string | undefined, network: CryptoNetwork | undefined) => ContractWallet | null;
}

export type ContractWallet = {
    address?: string,
    isContract?: boolean
    ready: boolean
}

export const useContractWalletsStore = create<WalletState>()(persist((set) => ({
    contractWallets: [],
    checkContractWallet: (address, network) => {

        if (!network) { throw new Error('Network is not provided') }

        (async () => {
            if (address && network.type == NetworkType.EVM && network.internal_name === KnownInternalNames.Networks.EthereumMainnet) {
                let isContractWallet: boolean = false

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
                            const bytecode = await publicClient.getBytecode({
                                address: address as `0x${string}`
                            });
                            isContractWallet = !!bytecode
                        })()

                        return ({
                            contractWallets: [
                                ...state.contractWallets.filter(w => w.address !== address),
                                { address: address, ready: true, isContract: isContractWallet }
                            ]
                        })
                    }
                })

                return { address: address, ready: true, value: isContractWallet }
            }
        })()
        return { ready: true, isContract: false }

    },
}),
    {
        name: 'contractWallets',
        storage: createJSONStorage(() => localStorage),
    }
))