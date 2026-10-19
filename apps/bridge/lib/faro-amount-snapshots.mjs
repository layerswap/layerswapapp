/** Detailed amount diagnostics belong on selected event rows, never session metadata. */
export const AMOUNT_SNAPSHOT_KEYS = new Set([
    'source_wallet_id',
    'source_wallet_provider',
    'source_wallet_address',
    'wallet_balance',
    'wallet_balance_network',
    'wallet_balance_token',
    'wallet_balance_timestamp',
    'wallet_balance_loading',
    'wallet_balance_error',
    'estimated_gas',
    'gas_reserve',
    'gas_token',
    'amount_calculation_preset',
    'amount_calculation_amount',
    'amount_calculation_wallet_id',
    'amount_calculation_wallet_provider',
    'amount_calculation_wallet_address',
    'amount_calculation_balance',
    'amount_calculation_balance_network',
    'amount_calculation_balance_token',
    'amount_calculation_balance_timestamp',
    'amount_calculation_gas',
    'amount_calculation_gas_reserve',
    'amount_calculation_gas_token',
])

/**
 * @template T
 * @param {Record<string, T>} attributes
 * @returns {Record<string, T>}
 */
export function withoutAmountSnapshots(attributes) {
    return Object.fromEntries(Object.entries(attributes).filter(([key]) => !AMOUNT_SNAPSHOT_KEYS.has(key)))
}
