import { create } from 'zustand'
import { SwapItem } from '../../../../../lib/layerSwapApiClient'
import { NetworkType } from '../../../../../Models/CryptoNetwork'
import { GetDefaultNetwork } from '../../../../../helpers/settingsHelper'
import { StarknetWindowObject } from 'get-starknet'
import KnownInternalNames from '../../../../../lib/knownIds'
import { Layer } from '../../../../../Models/Layer'

type Network = {
    address: string,
    metadata?: {
        isArgent?: boolean
    }
}

type Networks = {
    [network: string]: Network
}

interface WalletState {
    networks: Networks
    addNetwork: (swap: SwapItem, address: string, starknetAccount: StarknetWindowObject, imxAccount: string, source_network: Layer, networkData?: Network) => void
}

export const useWalletStore = create<WalletState>()((set) => ({
    networks: {},
    addNetwork: (swap, address, starknetAccount, imxAccount, source_network, networkData) => set((state) => {
        const sourceNetworkType = GetDefaultNetwork(source_network, swap.source_network_asset)?.type
        const sourceIsImmutableX = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase()
            || swap?.source_network === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()

        let accountAddress = ""
        if (swap.source_exchange) {
            accountAddress = swap.exchange_account_name
        }
        else if (sourceNetworkType === NetworkType.EVM) {
            accountAddress = address;
        }
        else if (sourceNetworkType === NetworkType.Starknet) {
            accountAddress = starknetAccount?.account?.address;
        }
        else if (sourceIsImmutableX) {
            accountAddress = imxAccount;
        }

        return {
            networks: {
                ...state.networks,
                [swap.source_network]: {
                    ...networkData,
                    address: accountAddress
                }
            }
        }
    }),
}))