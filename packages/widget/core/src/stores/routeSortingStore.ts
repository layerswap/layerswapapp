import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export enum SortingOption {
    RELEVANCE = 'relevance',
    MOST_USED = 'most_used',
    TRENDING = 'trending',
    ALPHABETICAL_ASC = 'alphabetical_asc',
    ALPHABETICAL_DESC = 'alphabetical_desc',
}

type RouteSortingState = {
    sortingOption: SortingOption
    setSortingOption: (val: SortingOption) => void
}

export const useRouteSortingStore = create<RouteSortingState>()(
    persist(
        (set) => ({
            sortingOption: SortingOption.RELEVANCE,
            setSortingOption: (val) => set({ sortingOption: val }),
        }),
        {
            name: 'ls-route-sorting',
            storage: createJSONStorage(() => localStorage),
        }
    )
)

