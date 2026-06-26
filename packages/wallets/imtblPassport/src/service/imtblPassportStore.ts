import { create } from 'zustand'

export type ImtblPassportStoreState = {
    ready: boolean
    instance: unknown | undefined

    _setInstance: (instance: unknown | undefined) => void
}

export const useImtblPassportStore = create<ImtblPassportStoreState>()((set) => ({
    ready: false,
    instance: undefined,

    _setInstance: (instance) => set({ instance, ready: !!instance }),
}))
