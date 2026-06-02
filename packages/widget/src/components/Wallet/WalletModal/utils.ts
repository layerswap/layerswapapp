// Dedupes by `key`, preserving first-seen order. The `isMultiChain` flag is no
// longer derived here — it is computed live in `useConnectors` from the current
// connector set so it stays correct as late-loading ecosystems populate.
export function removeDuplicatesWithKey(arr: any[], key: string) {
    const unique: any[] = [];
    const seen = new Set();

    arr.forEach(item => {
        const identifier = item[key];
        if (!seen.has(identifier)) {
            seen.add(identifier);
            unique.push(item);
        }
    });
    return unique;
}

export function sortRecentConnectors(a: { name: string, type?: string }, b: { name: string, type?: string }, recentConnectors: { connectorName?: string }[]) {
    function getIndex(c: { name: string }) {
        const idx = recentConnectors?.findIndex(v => v.connectorName === c.name);
        return idx === -1 ? Infinity : idx;
    }
    const indexA = getIndex(a);
    const indexB = getIndex(b);
    if (indexA !== indexB) {
        return indexA - indexB;
    }
    // Return 0 for non-recents so the stable sort preserves upstream registry
    // order. Sorting by `type.localeCompare` here groups wallets by type
    // alphabetically, which means a new `other`-type wallet arriving on page 2
    // gets inserted before all already-rendered `walletConnect`-type wallets,
    // visibly pushing them down. Upstream ordering (installed → featured →
    // registry) is already what we want.
    return 0;
}