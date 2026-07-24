/** The deposit funding methods the deposit widget's method picker can offer.
 * Single source of truth shared by the public `DepositProps`, the per-instance
 * `DepositSettingsProvider`, and the `MethodPicker`. "More wallets" is a
 * secondary entry of `wallet`, so it has no id of its own. */
export const DEPOSIT_METHODS = ["wallet", "deposit_address", "hyperliquid", "polymarket"] as const;
export type DepositMethodId = (typeof DEPOSIT_METHODS)[number];
