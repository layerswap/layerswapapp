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