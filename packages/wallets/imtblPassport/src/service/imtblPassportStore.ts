import { create } from 'zustand'
import type { Auth } from '@imtbl/auth'

export type ImtblPassportStoreState = {
    ready: boolean
    instance: Auth | undefined

    _setInstance: (instance: Auth | undefined) => void
}

export const useImtblPassportStore = create<ImtblPassportStoreState>()((set) => ({
    ready: false,
    instance: undefined,

    _setInstance: (instance) => set({ instance, ready: !!instance }),
}))
