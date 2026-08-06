import { useMemo, useRef } from "react";
import { InternalConnector, WalletConnectionProvider, WalletModalConnector } from "@/types/wallet";
import { resolveConnectorIdentity, resolveWalletIdentity } from "@/lib/wallets/identity";
import { mergeConnectors, type MergedWallet } from "@/lib/wallets/merge";
import { isMobile } from "@/lib/wallets/utils/isMobile";

type UseConnectorsParams = {
    searchValue?: string;
    recentConnectors: { providerName?: string; connectorName?: string }[];
    featuredProviders: WalletConnectionProvider[];
    filteredProviders: WalletConnectionProvider[];
    searchResults?: InternalConnector[];
};

type InitialSnapshot = {
    key: string;
    orderedKeys: string[];
    seen: Set<string>;
}

const toTile = (wallet: MergedWallet, isRecent: boolean): WalletModalConnector => ({
    ...wallet.primary,
    name: wallet.displayName,
    icon: wallet.icon,
    installUrl: wallet.installUrl,
    hasBrowserExtension: wallet.hasBrowserExtension,
    variants: wallet.variants,
    isMultiChain: wallet.isMultiChain,
    isRecent,
})

const walletTier = (wallet: MergedWallet, isRecent: boolean): number => {
    if (isRecent) return 0
    if (wallet.installed) return 1
    if (wallet.featuredRank != null) return 2
    if (!wallet.isRegistryOnly) return 3
    return 4
}

export function useConnectors({
    featuredProviders,
    filteredProviders,
    searchValue,
    recentConnectors,
    searchResults,
}: UseConnectorsParams) {

    const { featuredConnectors, additionalConnectors, resolvedSearchResults, merged } = useMemo(() => {
        const collect = (pick: (p: WalletConnectionProvider) => InternalConnector[] | undefined) =>
            featuredProviders
                .filter(p => (pick(p)?.length ?? 0) > 0)
                .flatMap(p => pick(p)!
                    .filter(c => searchValue ? c.name.toLowerCase().includes(searchValue.toLowerCase()) : true)
                    .map(c => ({ ...c, providerName: p.name }))) as InternalConnector[]

        const featured = collect(p => p.availableConnectors)
        const additional = collect(p => p.additionalConnectors)
        const search = searchResults ?? []

        return {
            featuredConnectors: featured,
            additionalConnectors: additional,
            resolvedSearchResults: searchResults ? search : undefined,
            merged: mergeConnectors([...featured, ...additional, ...search], {
                providers: featuredProviders,
                isMobilePlatform: isMobile(),
            }),
        }
    }, [featuredProviders, searchValue, searchResults]);

    const filterKey = useMemo(() => {
        const providerKey = featuredProviders.map(p => p.name).join('|')
        return `${providerKey}::${(searchValue ?? '').toLowerCase()}`
    }, [featuredProviders, searchValue])

    const initialSortedRef = useRef<InitialSnapshot | null>(null)
    const appendedKeysRef = useRef<string[]>([])

    const initialConnectors: WalletModalConnector[] = useMemo(() => {
        // Persisted host-origin data is untrusted at runtime even though the
        // state is typed. Validate both the container and its entries so a
        // legacy/colliding localStorage value cannot crash the wallet modal.
        const storedRecentConnectors = Array.isArray(recentConnectors) ? recentConnectors : []
        const recentKeys = new Set(storedRecentConnectors.flatMap(r =>
            r && typeof r === 'object' && typeof r.connectorName === 'string'
                ? [resolveWalletIdentity({ name: r.connectorName }).id as string]
                : []
        ))
        const isRecent = (wallet: MergedWallet) => recentKeys.has(wallet.key)
            || wallet.variants.some(v => recentKeys.has(resolveConnectorIdentity(v).id as string))

        const { wallets, keyOf } = merged

        const baseSeen = new Set<string>()
        const baseKeys: string[] = []
        for (const c of [...featuredConnectors, ...additionalConnectors]) {
            const key = keyOf(c)
            if (key && !baseSeen.has(key)) {
                baseSeen.add(key)
                baseKeys.push(key)
            }
        }

        if (initialSortedRef.current?.key !== filterKey) {
            // Filter context changed (providers or search query): resort the current
            // set once and reset the appended bucket.
            const sortable = baseKeys
                .map(key => wallets.get(key))
                .filter((w): w is MergedWallet => !!w)
            const tiers = new Map(sortable.map(w => [w.key, walletTier(w, isRecent(w))]))
            const sorted = [...sortable].sort((a, b) => {
                const tierA = tiers.get(a.key)!
                const tierB = tiers.get(b.key)!
                if (tierA !== tierB) return tierA - tierB
                if (tierA === 2) return (a.featuredRank ?? 0) - (b.featuredRank ?? 0)
                if (tierA === 4) {
                    const byOrder = (a.registryOrder ?? Infinity) - (b.registryOrder ?? Infinity)
                    if (byOrder) return byOrder
                    return a.displayName.localeCompare(b.displayName)
                }
                return 0
            })

            initialSortedRef.current = {
                key: filterKey,
                orderedKeys: sorted.map(w => w.key),
                seen: new Set(sorted.map(w => w.key)),
            }
            appendedKeysRef.current = []
        } else {
            // Filter unchanged: wallets arriving via pagination are appended in
            // insertion order and never re-sorted, so already rendered tiles keep
            // their position on scroll.
            const seen = initialSortedRef.current.seen
            for (const key of baseKeys) {
                if (!seen.has(key)) {
                    seen.add(key)
                    appendedKeysRef.current.push(key)
                }
            }
        }

        const orderedKeys = [...initialSortedRef.current.orderedKeys, ...appendedKeysRef.current]

        if (resolvedSearchResults?.length) {
            const known = new Set(orderedKeys)
            for (const c of resolvedSearchResults) {
                const key = keyOf(c)
                if (key && !known.has(key)) {
                    known.add(key)
                    orderedKeys.push(key)
                }
            }
        }

        const tiles: WalletModalConnector[] = []
        for (const key of orderedKeys) {
            const wallet = wallets.get(key)
            if (wallet) tiles.push(toTile(wallet, isRecent(wallet)))
        }
        return [
            ...tiles.filter(t => t.isRecent),
            ...tiles.filter(t => !t.isRecent),
        ]
    }, [merged, featuredConnectors, additionalConnectors, recentConnectors, resolvedSearchResults, filterKey]);

    return {
        featuredConnectors,
        additionalConnectors,
        resolvedSearchResults,
        initialConnectors,
        featuredProviders,
        filteredProviders,
    };
}
