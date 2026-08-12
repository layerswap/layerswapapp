export function removeDuplicatesWithKey(arr: any[], key: string | ((item: any) => string)) {
    const getId = typeof key === 'function' ? key : (item: any) => item[key];
    const countMap = {};
    const providerMap = {};

    // First pass: Count occurrences of each unique key and track unique providers.
    arr.forEach(item => {
        const identifier = getId(item);
        if (!identifier) return; // unkeyed items are never merged (kept verbatim below)
        countMap[identifier] = (countMap[identifier] || 0) + 1;

        // Track unique provider names for this connector
        if (!providerMap[identifier]) {
            providerMap[identifier] = new Set();
        }
        if (item.providerName) {
            providerMap[identifier].add(item.providerName);
        }
    });

    // Second pass: Create a new array with one instance of each object.
    const unique: any[] = [];
    const seen = new Set();

    arr.forEach(item => {
        const identifier = getId(item);
        if (!identifier) {
            unique.push({ ...item });
            return;
        }
        if (!seen.has(identifier)) {
            seen.add(identifier);
            unique.push(item);
        }
    });
    return unique;
}
