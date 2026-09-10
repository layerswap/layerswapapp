'use client'

import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import LayerSwapApiClient, { type SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import {
    MAX_PERSISTED_SWAP_ROUTES,
    swapRouteHistoryRepository,
    type PersistedSwapRoute,
    type SwapRouteHistoryRepository,
    type SwapRouteIdentity,
} from '@/lib/swapRouteHistoryDb'

type SwapRouteHistoryState = {
    environment?: string;
    hydratedEnvironment?: string;
    records: PersistedSwapRoute[];
}

export type SwapRouteRecency = {
    sourceRoutes: Map<string, number>;
    destinationRoutes: Map<string, number>;
}

export type SwapRouteOverrides = {
    sourceRoute?: SwapRouteIdentity | null;
    destinationRoute?: SwapRouteIdentity;
}

const EMPTY_RECORDS: PersistedSwapRoute[] = []
const hydrationPromises = new Map<string, Promise<void>>()

export const useSwapRouteHistoryStore = create<SwapRouteHistoryState>(() => ({
    records: EMPTY_RECORDS,
}))

export function getSwapRouteHistoryEnvironment() {
    const apiBase = (LayerSwapApiClient.apiBaseEndpoint || 'default').replace(/\/+$/, '')
    const apiKey = LayerSwapApiClient.apiKey || 'default'
    return `${apiBase}|${apiKey}`
}

export function toPersistedSwapRoute(
    response: SwapResponse,
    environment: string,
    overrides: SwapRouteOverrides = {},
): PersistedSwapRoute | undefined {
    const swap = response.swap
    const sourceRoute = Object.prototype.hasOwnProperty.call(overrides, 'sourceRoute')
        ? overrides.sourceRoute ?? undefined
        : swap.source_exchange
            ? undefined
            : asRouteIdentity(swap.source_network?.name, swap.source_token?.symbol)
    const destinationRoute = overrides.destinationRoute
        ?? asRouteIdentity(swap.destination_network?.name, swap.destination_token?.symbol)

    if (!swap.id || !destinationRoute) return undefined

    const parsedCreatedAt = Date.parse(swap.created_date)
    return {
        swapId: swap.id,
        environment,
        createdAt: Number.isFinite(parsedCreatedAt) ? parsedCreatedAt : Date.now(),
        sourceRoute,
        destinationRoute,
    }
}

export function mergeSwapRouteHistoryRecords(
    current: PersistedSwapRoute[],
    updates: PersistedSwapRoute[],
): PersistedSwapRoute[] {
    if (updates.length === 0) return current

    const recordsById = new Map(current.map(record => [record.swapId, record]))
    for (const record of updates) recordsById.set(record.swapId, record)

    const merged = [...recordsById.values()]
        .sort((a, b) => b.createdAt - a.createdAt || a.swapId.localeCompare(b.swapId))
        .slice(0, MAX_PERSISTED_SWAP_ROUTES)

    if (merged.length === current.length && merged.every((record, index) => recordsEqual(record, current[index]))) {
        return current
    }
    return merged
}

export function buildSwapRouteRecency(records: PersistedSwapRoute[]): SwapRouteRecency {
    const sourceRoutes = new Map<string, number>()
    const destinationRoutes = new Map<string, number>()

    for (const record of records) {
        if (record.sourceRoute) setLatest(sourceRoutes, record.sourceRoute, record.createdAt)
        setLatest(destinationRoutes, record.destinationRoute, record.createdAt)
    }

    return { sourceRoutes, destinationRoutes }
}

export function getRouteRecency(
    recency: SwapRouteRecency,
    direction: 'from' | 'to',
    network: string,
    token: string,
) {
    const index = direction === 'from' ? recency.sourceRoutes : recency.destinationRoutes
    return index.get(routeKey(network, token)) ?? 0
}

export function hydrateSwapRouteHistory(
    environment: string = getSwapRouteHistoryEnvironment(),
    repository: SwapRouteHistoryRepository = swapRouteHistoryRepository,
) {
    const state = useSwapRouteHistoryStore.getState()
    if (state.hydratedEnvironment === environment) return Promise.resolve()

    if (state.environment !== environment) {
        useSwapRouteHistoryStore.setState({
            environment,
            hydratedEnvironment: undefined,
            records: EMPTY_RECORDS,
        })
    }

    const inFlight = hydrationPromises.get(environment)
    if (inFlight) return inFlight

    const promise = repository.getRecent(environment)
        .then(persistedRecords => {
            const current = useSwapRouteHistoryStore.getState()
            if (current.environment !== environment) return

            // In-memory records may have been created while IndexedDB was
            // loading. Apply them last so hydration cannot overwrite them.
            const records = mergeSwapRouteHistoryRecords(persistedRecords, current.records)
            useSwapRouteHistoryStore.setState({
                records,
                hydratedEnvironment: environment,
            })
        })
        .catch(() => {
            const current = useSwapRouteHistoryStore.getState()
            if (current.environment === environment) {
                useSwapRouteHistoryStore.setState({ hydratedEnvironment: environment })
            }
        })
        .finally(() => {
            hydrationPromises.delete(environment)
        })

    hydrationPromises.set(environment, promise)
    return promise
}

export function recordSwapRouteHistory(
    response: SwapResponse,
    overrides?: SwapRouteOverrides,
    repository: SwapRouteHistoryRepository = swapRouteHistoryRepository,
) {
    return recordSwapRoutes([response], overrides ? [overrides] : undefined, repository)
}

export function recordFetchedSwapRouteHistory(
    responses: SwapResponse[],
    repository: SwapRouteHistoryRepository = swapRouteHistoryRepository,
) {
    return recordSwapRoutes(responses, undefined, repository)
}

export function useSwapRouteRecency() {
    const environment = getSwapRouteHistoryEnvironment()
    const records = useSwapRouteHistoryStore(state =>
        state.environment === environment ? state.records : EMPTY_RECORDS,
    )

    useEffect(() => {
        void hydrateSwapRouteHistory(environment)
    }, [environment])

    return useMemo(() => buildSwapRouteRecency(records), [records])
}

async function recordSwapRoutes(
    responses: SwapResponse[],
    overrides: SwapRouteOverrides[] | undefined,
    repository: SwapRouteHistoryRepository,
) {
    if (responses.length === 0) return

    const environment = getSwapRouteHistoryEnvironment()
    const records = responses
        .map((response, index) => toPersistedSwapRoute(response, environment, overrides?.[index]))
        .filter((record): record is PersistedSwapRoute => !!record)
    if (records.length === 0) return

    const state = useSwapRouteHistoryStore.getState()
    const currentRecords = state.environment === environment ? state.records : EMPTY_RECORDS
    const currentById = new Map(currentRecords.map(record => [record.swapId, record]))
    const changedRecords = records.filter(record => !recordsEqual(record, currentById.get(record.swapId)))
    if (state.environment === environment && changedRecords.length === 0) return

    const mergedRecords = mergeSwapRouteHistoryRecords(currentRecords, changedRecords)

    useSwapRouteHistoryStore.setState({
        environment,
        hydratedEnvironment: state.environment === environment ? state.hydratedEnvironment : undefined,
        records: mergedRecords,
    })
    await repository.upsert(changedRecords)
}

function asRouteIdentity(network?: string, token?: string): SwapRouteIdentity | undefined {
    if (!network || !token) return undefined
    return { network, token }
}

function routeKey(network: string, token: string) {
    return `${network}\u0000${token}`
}

function setLatest(index: Map<string, number>, route: SwapRouteIdentity, createdAt: number) {
    const key = routeKey(route.network, route.token)
    const previous = index.get(key) ?? 0
    if (createdAt > previous) index.set(key, createdAt)
}

function recordsEqual(a: PersistedSwapRoute, b: PersistedSwapRoute | undefined) {
    return !!b
        && a.swapId === b.swapId
        && a.environment === b.environment
        && a.createdAt === b.createdAt
        && routesEqual(a.sourceRoute, b.sourceRoute)
        && routesEqual(a.destinationRoute, b.destinationRoute)
}

function routesEqual(a: SwapRouteIdentity | undefined, b: SwapRouteIdentity | undefined) {
    return a?.network === b?.network && a?.token === b?.token
}
