import { createJSONStorage, persist } from 'zustand/middleware'
import { browserOnlyMiddleware } from '@layerswap/utils/common'
import { createStore } from 'zustand/vanilla'

export type ParadexAccountMap = Record<string, string>

type ParadexAccountStoreState = {
    paradexAccounts: ParadexAccountMap
    addParadexAccount: (account: { l1Address: string; paradexAddress: string }) => void
    removeParadexAccount: (l1Address: string) => void
}

type PersistedParadexAccountState = Pick<ParadexAccountStoreState, 'paradexAccounts'>

export const paradexAccountStore = createStore<ParadexAccountStoreState>()(
    browserOnlyMiddleware(persist)<ParadexAccountStoreState, [], [], PersistedParadexAccountState>(
        (set) => ({
            paradexAccounts: {},
            addParadexAccount: ({ l1Address, paradexAddress }) => set((state) => ({
                paradexAccounts: {
                    ...state.paradexAccounts,
                    [l1Address.toLowerCase()]: paradexAddress,
                },
            })),
            removeParadexAccount: (l1Address) => set((state) => {
                const paradexAccounts = { ...state.paradexAccounts }
                delete paradexAccounts[l1Address.toLowerCase()]
                return { paradexAccounts }
            }),
        }),
        {
            // Preserve the existing key and state shape so persisted Paradex
            // account mappings survive the store extraction.
            name: 'ls-paradex-accounts',
            storage: createJSONStorage(() => window.localStorage),
            partialize: ({ paradexAccounts }) => ({ paradexAccounts }),
        },
    ),
)
