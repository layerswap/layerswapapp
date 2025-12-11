export function removeDuplicatesWithKey(arr: any[], key: string) {
    const countMap = {};

    // First pass: Count occurrences of each unique key.
    arr.forEach(item => {
        const identifier = item[key];
        countMap[identifier] = (countMap[identifier] || 0) + 1;
    });

    // Second pass: Create a new array with one instance of each object.
    const unique: any[] = [];
    const seen = new Set();

    arr.forEach(item => {
        const identifier = item[key];
        if (!seen.has(identifier)) {
            seen.add(identifier);
            // Add a property 'duplicateCount' to indicate extra duplicates found.
            unique.push({
                ...item,
                isMultiChain: countMap[identifier] > 1
            });
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
    if (a.type && b.type) {
        return a.type.localeCompare(b.type);
    }
    return 0;
}
