import { useMemo, useRef } from "react";
import { InternalConnector, WalletModalConnector, WalletProvider } from "@/Models/WalletProvider";
import { removeDuplicatesWithKey } from "@/components/WalletModal/utils";
import { walletKey } from "@/lib/wallets/utils/walletKey";
import { getRegistryEntry, type WalletConnectWalletBase } from "@/lib/wallets/walletConnect/types";
import { createRegistryConnector } from "@/lib/wallets/walletConnect/createRegistryConnector";
import { isMobile } from "@/lib/wallets/connectors/utils/isMobile";

type UseConnectorsParams = {
    searchValue?: string;
    recentConnectors: { providerName?: string; connectorName?: string }[];
    featuredProviders: WalletProvider[];
    filteredProviders: WalletProvider[];
    searchResults?: InternalConnector[];
};

type InitialSnapshot = {
    key: string;
    list: InternalConnector[];
    seen: Set<string>;
}

const resolveNames = (groups: InternalConnector[][]): InternalConnector[][] => {
    const canonical = new Map<string, string>()
    const fromInstalled = new Set<string>()
    for (const group of groups) {
        for (const c of group) {
            if (!c?.name) continue
            const key = walletKey(c.name)
            if (c.type === 'injected' ? !fromInstalled.has(key) : !canonical.has(key)) {
                canonical.set(key, c.name)
                if (c.type === 'injected') fromInstalled.add(key)
            }
        }
    }
    return groups.map(group => group.map(c => c?.name ? { ...c, name: canonical.get(walletKey(c.name)) ?? c.name } : c))
}

const resolveChainConnectors = (pool: InternalConnector[], providers: WalletProvider[]) => {
    const toProvider: Record<string, string> = { eip155: 'EVM', solana: 'Solana' }
    const mobile = isMobile()
    const records = new Map<string, { variants: InternalConnector[], entry?: WalletConnectWalletBase }>()
    const recordFor = (name: string) => records.get(name.toLowerCase()) ?? records.set(name.toLowerCase(), { variants: [] }).get(name.toLowerCase())!

    for (const c of pool) {
        if (!c.name) continue
        const record = recordFor(c.name)
        if (c.providerName && !record.variants.some(x => x.providerName === c.providerName)) record.variants.push(c)
        if (!record.entry) {
            const wk = walletKey(c.name)
            record.entry = getRegistryEntry(c) ?? providers.find(p => p.name === c.providerName)?.registryWallets?.find(r => walletKey(r.name) === wk || walletKey(r.id) === wk)
        }
    }
    for (const record of records.values()) {
        for (const chain of record.entry?.chains ?? []) {
            const p = toProvider[chain.split(':')[0]]
            if (p && providers.some(prov => prov.name === p) && !record.variants.some(x => x.providerName === p)) record.variants.push(createRegistryConnector(record.entry!, mobile, p))
        }
    }
    return records
}

export function useConnectors({
    featuredProviders,
    filteredProviders,
    searchValue,
    recentConnectors,
    searchResults,
}: UseConnectorsParams) {

    const { featuredConnectors, additionalConnectors, resolvedSearchResults } = useMemo(() => {
        const collect = (pick: (p: WalletProvider) => InternalConnector[] | undefined) =>
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
        const recentNames = new Set(recentConnectors?.map(r => r.connectorName?.toLowerCase()).filter(Boolean))
        const isRecent = (c: InternalConnector) => recentNames.has(c.name.toLowerCase())
        const isInstalled = (c: InternalConnector) => c.type === 'injected' && !c.isLoadable

        if (initialSortedRef.current?.key !== filterKey) {
            // Filter context changed (providers or search query): resort the current
            // set once and reset the appended bucket. Names are already resolved, so
            // the same wallet from different chains collapses to one tile here.
            const recent = featuredConnectors.filter(c => isRecent(c))
            const installed = featuredConnectors.filter(c => !isRecent(c) && isInstalled(c))
            const rest = featuredConnectors.filter(c => !isRecent(c) && !isInstalled(c))
            const sorted = removeDuplicatesWithKey(
                [...recent, ...installed, ...rest, ...additionalConnectors],
                'name'
            ) as InternalConnector[]

            initialSortedRef.current = {
                key: filterKey,
                list: sorted,
                seen: new Set(sorted.map(c => c.name.toLowerCase())),
            }
            appendedRef.current = []
        } else {
            // Filter unchanged: any connectors arriving via pagination are appended
            // to a separate bucket in insertion order and never re-sorted, so already
            // rendered tiles keep their position on scroll.
            const seen = initialSortedRef.current.seen
            const appendIfNew = (c: InternalConnector) => {
                const key = c.name.toLowerCase()
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
            const variants = connectorsByWallet.get(c.name.toLowerCase())?.variants ?? []
            return { ...c, variants, isMultiChain: variants.length > 1 }
        })

        const base = [...initialSortedRef.current.list, ...appendedRef.current]

        if (resolvedSearchResults?.length) {
            const existingNames = new Set(base.map(c => c.name.toLowerCase()))
            const newResults = (removeDuplicatesWithKey(resolvedSearchResults, 'name') as InternalConnector[])
                .filter(c => !existingNames.has(c.name.toLowerCase()))
            return withMultiChain([...base, ...newResults])
        }

        return withMultiChain(base)
    }, [featuredConnectors, additionalConnectors, recentConnectors, resolvedSearchResults, filterKey]);

    return {
        featuredConnectors,
        additionalConnectors,
        resolvedSearchResults,
        initialConnectors,
        featuredProviders,
        filteredProviders,
    };
}
