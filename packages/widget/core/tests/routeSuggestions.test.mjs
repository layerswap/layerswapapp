import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createRequire } from 'node:module'
import { loadSource } from './helpers/source.mjs'

const require = createRequire(import.meta.url)
const historyDb = loadSource('lib/swapRouteHistoryDb.ts')
const historyStore = loadSource('stores/swapRouteHistoryStore.ts', {
    react: require('react'),
    zustand: require('zustand'),
    // These tests do not make API requests; avoid initializing the API client.
    '@/lib/apiClients/layerSwapApiClient': { default: {} },
    '@/lib/swapRouteHistoryDb': historyDb,
})
const { buildSwapRouteRecency } = historyStore
const routeUtils = loadSource('helpers/routeUtils.ts', { '@/stores/swapRouteHistoryStore': historyStore })
const { sortSuggestedTokenElements } = routeUtils
const { groupRoutes } = loadSource('hooks/useFormRoutes.ts', {
    swr: {},
    react: {},
    '../context/settings': {},
    './useAllWithdrawalBalances': {},
    '../helpers/routes': {},
    '@/lib/apiClients/layerSwapApiClient': {},
    './useExchangeNetworks': {},
    '@/stores/recentRoutesStore': {},
    '@/stores/routeTokenSwitchStore': {},
    '../helpers/balanceHelper': loadSource('helpers/balanceHelper.ts'),
    '@/stores/routeSortingStore': { SortingOption: { RELEVANCE: 'relevance' } },
    '../helpers/routeUtils': routeUtils,
    '@/lib/extendedRoutes/registry': {},
    '@/stores/swapRouteHistoryStore': historyStore,
})

function item(network, token, rank) {
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
    }
}

function persisted(item, createdAt) {
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
const emptyHistory = {
    sourceRoutes: {},
    destinationRoutes: {},
}

describe('suggestion route sorting', () => {
    it('keeps funded source routes ahead of availability and same-network pinning', () => {
        const routes = [['BASE', 'inactive'], ['ARBITRUM', 'not_found'], ['AVALANCHE', 'active']]
            .map(([name, status]) => {
                const { route: network, token } = item(name, 'USDC', 1).route
                return { ...network, tokens: [{ ...token, asset: 'USDC', status }] }
            })
        const props = {
            routes,
            balances: {
                BASE: { balances: [{ token: 'USDC', amount: 88.57 }] },
                ARBITRUM: { balances: [{ token: 'USDC', amount: 14.98 }] },
                AVALANCHE: { balances: [{ token: 'USDC', amount: 0.12 }] },
            },
            direction: 'from',
            groupBy: 'network',
            recents: emptyHistory,
            balancesLoaded: false,
            oppositeNetwork: 'AVALANCHE',
        }
        const expectedOrder = ['BASE', 'ARBITRUM', 'AVALANCHE']
        const rows = groupRoutes(props)
        assert.deepEqual(rows.filter(row => row.type === 'suggested_token').map(row => row.route.route.name), expectedOrder)
        assert.deepEqual(rows.filter(row => row.type === 'network').map(row => row.route.name), expectedOrder)

        const tokenGroup = groupRoutes({ ...props, groupBy: 'token' }).find(row => row.type === 'grouped_token')
        assert.deepEqual(tokenGroup.items.map(row => row.route.route.name), expectedOrder)

        const destinations = groupRoutes({ ...props, direction: 'to' })
        assert.deepEqual(destinations.filter(row => row.type === 'suggested_token').map(row => row.route.route.name), ['AVALANCHE'])
        assert.equal(destinations.find(row => row.type === 'network').route.name, 'AVALANCHE')
    })

    it('keeps source balance ahead of persisted recency', () => {
        const higherBalance = item('BALANCE', 'AAA', 2)
        const moreRecent = item('RECENT', 'BBB', 1)
        const balances = {
            BALANCE: { balances: [{ token: 'AAA', amount: 10 }] },
            RECENT: { balances: [{ token: 'BBB', amount: 1 }] },
        }
        const recency = buildSwapRouteRecency([persisted(moreRecent, 20), persisted(higherBalance, 10)])
        const sorted = [moreRecent, higherBalance].sort(sortSuggestedTokenElements('from', balances, emptyHistory, recency))
        assert.equal(sorted[0], higherBalance)
    })

    it('keeps persisted recency ahead of recent-route usage', () => {
        const heavilyUsed = item('USED', 'AAA', 1)
        const moreRecent = item('RECENT', 'BBB', 2)
        const history = {
            sourceRoutes: { USED: { AAA: 100 } },
            destinationRoutes: {},
        }
        const recency = buildSwapRouteRecency([persisted(heavilyUsed, 10), persisted(moreRecent, 20)])
        const sorted = [heavilyUsed, moreRecent].sort(sortSuggestedTokenElements('from', null, history, recency))
        assert.equal(sorted[0], moreRecent)
    })

    it('uses recent-route usage and then API rank when no persisted recency exists', () => {
        const used = item('USED', 'AAA', 10)
        const ranked = item('RANKED', 'BBB', 1)
        const history = {
            sourceRoutes: { USED: { AAA: 2 } },
            destinationRoutes: {},
        }
        const emptyRecency = buildSwapRouteRecency([])
        assert.equal([ranked, used].sort(sortSuggestedTokenElements('from', null, history, emptyRecency))[0], used)
        assert.equal([used, ranked].sort(sortSuggestedTokenElements('from', null, emptyHistory, emptyRecency))[0], ranked)
    })

    it('ignores wallet balances for destination suggestions', () => {
        const higherBalance = item('BALANCE', 'AAA', 1)
        const moreRecent = item('RECENT', 'BBB', 2)
        const balances = {
            BALANCE: { balances: [{ token: 'AAA', amount: 10 }] },
            RECENT: { balances: [{ token: 'BBB', amount: 1 }] },
        }
        const recency = buildSwapRouteRecency([persisted(higherBalance, 10), persisted(moreRecent, 20)])
        const sorted = [higherBalance, moreRecent].sort(sortSuggestedTokenElements('to', balances, emptyHistory, recency))
        assert.equal(sorted[0], moreRecent)
    })
})
