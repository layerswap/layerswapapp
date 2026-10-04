import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type WalletBatch = {
    id?: string
    walletId: string
    internalId?: string
    providerName: string
    account: string
    chainId: number
    networkName: string
    state: 'submitting' | 'pending' | 'unknown' | 'failed' | 'confirmed'
    standardNextAttempt?: boolean
    timestamp: number
}

export const isBatchOutstanding = (batch: WalletBatch | undefined) =>
    !!batch && (batch.state === 'submitting' || batch.state === 'pending' || batch.state === 'unknown')

type WalletBatchStore = {
    batches: Record<string, WalletBatch>
    setBatch: (swapId: string, batch: WalletBatch) => void
    removeBatch: (swapId: string) => void
}

export const useWalletBatchStore = create(persist<WalletBatchStore>(set => ({
    batches: {},
    setBatch: (swapId, batch) => set(state => ({ batches: { ...state.batches, [swapId]: batch } })),
    removeBatch: swapId => set(state => {
        const { [swapId]: removed, ...batches } = state.batches
        return { batches }
    }),
}), { name: 'walletBatches', storage: createJSONStorage(() => localStorage) }))
