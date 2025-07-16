import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware';

export type RecentTokens = {
    sourceTokens: {
        network: string
        token?: string
    }[],
    destinationTokens: {
        network: string
        token?: string
    }[],
}
interface RecentTokensState {
    recentTokens: RecentTokens;
    updateRecentTokens: (
        fromObject?: { network: string, token?: string, },
        toObject?: { network: string, token?: string, },
    ) => void;
}

export const useRecentTokensStore = create<RecentTokensState>()(persist((set) => ({
    recentTokens: {
        sourceTokens: [],
        destinationTokens: [],
    },
    updateRecentTokens: (fromObject, toObject) => {
        set(state => ({
            recentTokens: updateRecentTokensHelper(state.recentTokens, fromObject, toObject)
        }))
    }
}), {
    name: 'recentTokens',
    storage: createJSONStorage(() => localStorage),
}))

const moveToEnd = (
    array: { network: string, token?: string, }[],
    item: { network: string, token?: string, },
): { network: string, token?: string, }[] => {
    const filtered = array.filter(existing => !(existing.network === item.network && existing.token === item.token));
    return [...filtered, item];
}

const updateRecentTokensHelper = (
    prev: RecentTokens,
    fromObject?: { network: string, token?: string, },
    toObject?: { network: string, token?: string, },
): RecentTokens => {


    return {
        sourceTokens: fromObject
            ? moveToEnd(prev.sourceTokens || [], fromObject,)
            : (prev.sourceTokens || []),
        destinationTokens: toObject
            ? moveToEnd(prev.destinationTokens || [], toObject,)
            : (prev.destinationTokens || []),
    };
}