export const nameKey = (value: string): string =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, '')
