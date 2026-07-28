import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware';

export type RoutesHistory = {
    sourceRoutes: RouteItem,
    destinationRoutes: RouteItem
}

type RouteItem = {
    [key: string]: {
        [key: string]: number
    }
}

type UpdateHistoryArgs = {
    from: { network: string, token: string } | undefined,
    to: { network: string, token: string },
}

interface RecentNetworksState {
    recentRoutes: RoutesHistory;
    updateRecentNetworks: (args: UpdateHistoryArgs
    ) => void;
}

export const useRecentNetworksStore = create<RecentNetworksState>()(persist((set) => ({
    recentRoutes: {
        sourceRoutes: {},
        destinationRoutes: {},
    },
    updateRecentNetworks: (args: UpdateHistoryArgs) => {
        set(state => ({
            recentRoutes: updateRecentNetworksHelper(state.recentRoutes, args)
        }))
    }
}), {
    name: 'recentRoutes',
    storage: createJSONStorage(() => localStorage),
}))

const updateRecentNetworksHelper = (
    prev: RoutesHistory,
    data: UpdateHistoryArgs
): RoutesHistory => {
    const { from, to } = data
    return {
        sourceRoutes: {
            ...prev.sourceRoutes,
            ...(from ? {
                [from.network]: {
                    ...prev.sourceRoutes[from.network],
                    [from.token]: (prev.sourceRoutes?.[from.network]?.[from.token] || 0) + 1
                }
            } : {})
        },
        destinationRoutes: {
            ...prev.destinationRoutes,
            [to.network]: {
                ...prev.destinationRoutes[to.network],
                [to.token]: (prev.destinationRoutes?.[to.network]?.[to.token] || 0) + 1
            }
        },
    };
}
