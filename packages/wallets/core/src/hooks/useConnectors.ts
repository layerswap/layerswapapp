"use client";
import { type InternalConnector } from '@layerswap/widget-types';
import { useMemo, useRef } from "react";
import { WalletConnectionProvider } from "@/types/wallet";
import { WalletModalConnector } from "@/types/provider";
import type { NetworkType } from "@layerswap/widget-types";
import { isWalletConnectRegistryConnector } from "@/lib/walletConnect/connectorSource";
import { getProvidersForWalletConnectNetworkType } from "@/lib/walletConnect/providerCapabilities";
import { removeDuplicatesWithKey } from '@/lib/removeDuplicatesWithKey';
import { walletKey } from '@/lib/walletKey';

type UseConnectorsParams = {
    searchValue?: string;
    recentConnectors: { providerName?: string; connectorName?: string }[];
    featuredProviders: WalletConnectionProvider[];
    filteredProviders: WalletConnectionProvider[];
    searchResults?: InternalConnector[];
};

type InitialSnapshot = {
    key: string;
    list: InternalConnector[];
    seen: Set<string>;
}

const UNMERGEABLE_WALLETS = ['nova', 'nova wallet']
const NAME_OVERRIDES: Record<string, string> = { bitget: 'Bitget Wallet' }
export const connectorKey = (name: string) =>
    UNMERGEABLE_WALLETS.includes(name.toLowerCase()) ? name.toLowerCase() : walletKey(name)

const resolveNames = (groups: InternalConnector[][]): InternalConnector[][] => {
    const canonical = new Map<string, string>()
    for (const group of groups) {
        for (const c of group) {
            if (!c?.name) continue
            if (UNMERGEABLE_WALLETS.includes(c.name.toLowerCase())) continue
            const key = walletKey(c.name)
            const current = canonical.get(key)
            const hasSuffix = c.name.toLowerCase().trim().endsWith(' wallet')
            if (!current || (hasSuffix && !current.toLowerCase().trim().endsWith(' wallet')))
                canonical.set(key, c.name)
        }
    }
    return groups.map(group => group.map(c => c?.name ? { ...c, name: NAME_OVERRIDES[walletKey(c.name)] ?? canonical.get(walletKey(c.name)) ?? c.name } : c))
}

export const resolveChainConnectors = (pool: InternalConnector[], providers: WalletConnectionProvider[]) => {
    const records = new Map<string, { connectors: InternalConnector[], networkTypes: Set<NetworkType> }>()
    const recordFor = (name: string) => {
        const k = connectorKey(name)
        return records.get(k) ?? records.set(k, { connectors: [], networkTypes: new Set() }).get(k)!
    }

    for (const c of pool) {
        if (!c.name) continue
        const record = recordFor(c.name)
        record.connectors.push(c)
        for (const networkType of c.networkTypes ?? []) record.networkTypes.add(networkType)
    }
    const resolved = new Map<string, InternalConnector[]>()
    for (const [key, record] of records) {
        const variants: InternalConnector[] = []
        for (const connector of record.connectors) {
            if (connector.providerName && !variants.some(variant => variant.providerName === connector.providerName)) variants.push(connector)
        }
        const template = record.connectors.find(isWalletConnectRegistryConnector)
        for (const networkType of record.networkTypes) {
            const matchingProviders = getProvidersForWalletConnectNetworkType(providers, networkType)
            for (const provider of matchingProviders) {
                if (template && !variants.some(variant => variant.providerName === provider.name)) {
                    variants.push({ ...template, providerName: provider.name, isLoadable: false })
                }
            }
        }
        variants.sort((a, b) => providers.findIndex(p => p.name === a.providerName) - providers.findIndex(p => p.name === b.providerName))
        resolved.set(key, variants)
    }
    return resolved
}

export function useConnectors({
    featuredProviders,
    filteredProviders,
    searchValue,
    recentConnectors,
    searchResults,
}: UseConnectorsParams) {

    const { featuredConnectors, additionalConnectors, resolvedSearchResults } = useMemo(() => {
        const collect = (pick: (p: WalletConnectionProvider) => InternalConnector[] | undefined) =>
            featuredProviders
                .filter(p => (pick(p)?.length ?? 0) > 0)
                .flatMap(p => pick(p)!
                    .filter(c => searchValue ? c.name.toLowerCase().includes(searchValue.toLowerCase()) : true)
                    .map(c => ({ ...c, providerName: p.name }))) as InternalConnector[]

        const [featured, additional, search] = resolveNames([
            collect(p => p.availableConnectors),
            collect(p => p.additionalConnectors),
            searchResults ?? [],
        ])
        return {
            featuredConnectors: featured,
            additionalConnectors: additional,
            resolvedSearchResults: searchResults ? search : undefined,
        }
    }, [featuredProviders, searchValue, searchResults]);

    const filterKey = useMemo(() => {
        const providerKey = featuredProviders.map(p => p.name).join('|')
        return `${providerKey}::${(searchValue ?? '').toLowerCase()}`
    }, [featuredProviders, searchValue])

    const initialSortedRef = useRef<InitialSnapshot | null>(null)
    const appendedRef = useRef<InternalConnector[]>([])

    const initialConnectors: WalletModalConnector[] = useMemo(() => {
        // Persisted host-origin data is untrusted at runtime even though the
        // state is typed. Validate both the container and its entries so a
        // legacy/colliding localStorage value cannot crash the wallet modal.
        const storedRecentConnectors = Array.isArray(recentConnectors) ? recentConnectors : []
        const recentNames = new Set(storedRecentConnectors.flatMap(r =>
            r && typeof r === 'object' && typeof r.connectorName === 'string'
                ? [connectorKey(r.connectorName)]
                : []
        ))
        // Use the same identity rule as connector deduplication: canonicalize
        // aliases such as Bitget Wallet, while preserving Nova and Nova Wallet
        // as the intentionally separate tiles they are.
        const isRecent = (c: InternalConnector) => recentNames.has(connectorKey(c.name))
        const isInstalled = (c: InternalConnector) => c.type === 'injected' && !c.isLoadable

        if (initialSortedRef.current?.key !== filterKey) {
            // Filter context changed (providers or search query): resort the current
            // set once and reset the appended bucket. Names are already resolved, so
            // the same wallet from different chains collapses to one tile here.
            const all = [...featuredConnectors, ...additionalConnectors]
            const recent = all.filter(c => isRecent(c))
            const installed = all.filter(c => !isRecent(c) && isInstalled(c))
            const rest = all.filter(c => !isRecent(c) && !isInstalled(c))
            const sorted = removeDuplicatesWithKey(
                [...recent, ...installed, ...rest],
                c => connectorKey(c.name)
            ) as InternalConnector[]

            initialSortedRef.current = {
                key: filterKey,
                list: sorted,
                seen: new Set(sorted.map(c => connectorKey(c.name))),
            }
            appendedRef.current = []
        } else {
            // Filter unchanged: any connectors arriving via pagination are appended
            // to a separate bucket in insertion order and never re-sorted, so already
            // rendered tiles keep their position on scroll.
            const seen = initialSortedRef.current.seen
            const appendIfNew = (c: InternalConnector) => {
                const key = connectorKey(c.name)
                if (!seen.has(key)) {
                    seen.add(key)
                    appendedRef.current.push(c)
                }
            }
            for (const c of featuredConnectors) appendIfNew(c)
            for (const c of additionalConnectors) appendIfNew(c)
        }

        const pool = [...featuredConnectors, ...additionalConnectors, ...(resolvedSearchResults ?? [])]
        const connectorsByWallet = resolveChainConnectors(pool, featuredProviders)
        const withMultiChain = (list: InternalConnector[]): WalletModalConnector[] => list.map(c => {
            const variants = connectorsByWallet.get(connectorKey(c.name)) ?? []
            return { ...c, variants, isMultiChain: variants.length > 1 }
        })

        const recentsFirst = (list: WalletModalConnector[]): WalletModalConnector[] => [
            ...list.filter(isRecent).map(c => ({ ...c, isRecent: true })),
            ...list.filter(c => !isRecent(c)),
        ]

        const base = [...initialSortedRef.current.list, ...appendedRef.current]

        let list = base
        if (resolvedSearchResults?.length) {
            const existingNames = new Set(base.map(c => connectorKey(c.name)))
            const newResults = (removeDuplicatesWithKey(resolvedSearchResults, c => connectorKey(c.name)) as InternalConnector[])
                .filter(c => !existingNames.has(connectorKey(c.name)))
            list = [...base, ...newResults]
        }

        return recentsFirst(withMultiChain(list))
    }, [featuredConnectors, additionalConnectors, recentConnectors, resolvedSearchResults, filterKey, featuredProviders]);

    return {
        featuredConnectors,
        additionalConnectors,
        resolvedSearchResults,
        initialConnectors,
        featuredProviders,
        filteredProviders,
    };
}
