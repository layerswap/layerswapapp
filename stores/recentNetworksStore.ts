import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware';

export type RecentNetworks = {
    sourceNetworks: string[],
    destinationNetworks: string[]
}
interface RecentNetworksState {
    recentNetworks: RecentNetworks;
    updateRecentNetworks: (
        fromName?: string,
        toName?: string,
    ) => void;
}

export const useRecentNetworksStore = create<RecentNetworksState>()(persist((set) => ({
    recentNetworks: {
        sourceNetworks: [],
        destinationNetworks: [],
    },
    updateRecentNetworks: (fromName, toName) => {
        set(state => ({
            recentNetworks: updateRecentNetworksHelper(state.recentNetworks, fromName, toName)
        }))
    }
}), {
    name: 'recentNetworks',
    storage: createJSONStorage(() => localStorage),
}))

const moveToEnd = (array: string[], item: string): string[] => {
    const filtered = array.filter(i => i !== item);
    return [...filtered, item];
};

const updateRecentNetworksHelper = (
    prev: RecentNetworks,
    fromName?: string,
    toName?: string,
): RecentNetworks => {

    return {
        sourceNetworks: fromName
            ? moveToEnd(prev.sourceNetworks || [], fromName)
            : (prev.sourceNetworks || []),
        destinationNetworks: toName
            ? moveToEnd(prev.destinationNetworks || [], toName)
            : (prev.destinationNetworks || []),
    };
}
