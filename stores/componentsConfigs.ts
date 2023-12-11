import { create } from 'zustand'

interface Configs {
    isModalOpen: boolean
    setIsModalOpen: (value: boolean) => void;
}

export const useComponentsConfigs = create<Configs>()((set) => ({
    isModalOpen: false,
    setIsModalOpen: (value: boolean) => set(() => {
        return ({
            isModalOpen: value
        })
    }),
}))