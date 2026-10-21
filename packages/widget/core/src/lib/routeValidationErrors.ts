// Route/amount validation applies to both gasless and standard transfers.
// These actionable errors neither disable gasless nor need API error reporting.
export const ROUTE_VALIDATION_ERROR_CODES: ReadonlySet<string> = new Set([
    'ROUTE_NOT_FOUND_ERROR',
    'PRICE_IMPACT_TOO_HIGH',
    'GREATER_THAN_MAX_ERROR',
    'LESS_THAN_MIN_ERROR',
])
