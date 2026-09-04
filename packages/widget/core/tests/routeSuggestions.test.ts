import { describe, expect, it } from 'vitest'
import type { NetworkBalance } from '@layerswap/widget-types'
import type { NetworkTokenElement } from '@/Models/Route'
import { sortSuggestedTokenElements } from '@/helpers/routeUtils'
import type { RoutesHistory } from '@/stores/recentRoutesStore'
import { buildSwapRouteRecency } from '@/stores/swapRouteHistoryStore'
import type { PersistedSwapRoute } from '@/lib/swapRouteHistoryDb'

function item(network: string, token: string, rank: number): NetworkTokenElement {
    return {
        type: 'suggested_token',
        route: {
            route: {
                name: network,
                display_name: network,
                tokens: [],
            },
            token: {
                symbol: token,
                price_in_usd: 1,
                source_rank: rank,
                destination_rank: rank,
            },
        },
    } as NetworkTokenElement
}

function persisted(item: NetworkTokenElement, createdAt: number): PersistedSwapRoute {
    const route = {
        network: item.route.route.name,
        token: item.route.token.symbol,
    }
    return {
        swapId: `${route.network}-${createdAt}`,
        environment: 'environment',
        createdAt,
        sourceRoute: route,
        destinationRoute: route,
    }
}

const emptyHistory: RoutesHistory = {
    sourceRoutes: {},
    destinationRoutes: {},
}

describe('suggestion route sorting', () => {
    it('keeps source balance ahead of persisted recency', () => {
        const higherBalance = item('BALANCE', 'AAA', 2)
        const moreRecent = item('RECENT', 'BBB', 1)
        const balances = {
            BALANCE: { balances: [{ token: 'AAA', amount: 10 }] },
            RECENT: { balances: [{ token: 'BBB', amount: 1 }] },
        } as Record<string, NetworkBalance>
        const recency = buildSwapRouteRecency([persisted(moreRecent, 20), persisted(higherBalance, 10)])

        const sorted = [moreRecent, higherBalance].sort(
            sortSuggestedTokenElements('from', balances, emptyHistory, recency),
        )

        expect(sorted[0]).toBe(higherBalance)
    })

    it('keeps persisted recency ahead of recent-route usage', () => {
        const heavilyUsed = item('USED', 'AAA', 1)
        const moreRecent = item('RECENT', 'BBB', 2)
        const history: RoutesHistory = {
            sourceRoutes: { USED: { AAA: 100 } },
            destinationRoutes: {},
        }
        const recency = buildSwapRouteRecency([persisted(heavilyUsed, 10), persisted(moreRecent, 20)])

        const sorted = [heavilyUsed, moreRecent].sort(
            sortSuggestedTokenElements('from', null, history, recency),
        )

        expect(sorted[0]).toBe(moreRecent)
    })

    it('uses recent-route usage and then API rank when no persisted recency exists', () => {
        const used = item('USED', 'AAA', 10)
        const ranked = item('RANKED', 'BBB', 1)
        const history: RoutesHistory = {
            sourceRoutes: { USED: { AAA: 2 } },
            destinationRoutes: {},
        }
        const emptyRecency = buildSwapRouteRecency([])

        expect([ranked, used].sort(sortSuggestedTokenElements('from', null, history, emptyRecency))[0]).toBe(used)
        expect([used, ranked].sort(sortSuggestedTokenElements('from', null, emptyHistory, emptyRecency))[0]).toBe(ranked)
    })

    it('ignores wallet balances for destination suggestions', () => {
        const higherBalance = item('BALANCE', 'AAA', 1)
        const moreRecent = item('RECENT', 'BBB', 2)
        const balances = {
            BALANCE: { balances: [{ token: 'AAA', amount: 10 }] },
            RECENT: { balances: [{ token: 'BBB', amount: 1 }] },
        } as Record<string, NetworkBalance>
        const recency = buildSwapRouteRecency([persisted(higherBalance, 10), persisted(moreRecent, 20)])

        const sorted = [higherBalance, moreRecent].sort(
            sortSuggestedTokenElements('to', balances, emptyHistory, recency),
        )

        expect(sorted[0]).toBe(moreRecent)
    })
})
