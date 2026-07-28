import { NetworkRouteToken } from "@/Models/Network";

/**
 * Token amount equivalent to `defaultAmountUsd` worth of `token`, truncated to
 * the token's precision. Returns undefined when seeding is off
 * (`defaultAmountUsd <= 0`), the price is unknown, or the result rounds to zero.
 *
 * Shared so the wallet method and the extended-source shortcut (e.g. Hyperliquid)
 * seed the amount identically — the picker seeds on manual source selection
 * (SourceStep), the shortcut seeds at Formik mount (useDepositInitialValues).
 */
export function seedDefaultAmount(
    token: NetworkRouteToken | undefined,
    defaultAmountUsd: number,
): string | undefined {
    const price = token?.price_in_usd;
    if (!token || defaultAmountUsd <= 0 || !price || price <= 0) return undefined;
    const precision = token.precision || 6;
    const tokenAmount = defaultAmountUsd / price;
    const factor = Math.pow(10, precision);
    const truncated = Math.trunc(tokenAmount * factor) / factor;
    return truncated > 0 ? truncated.toString() : undefined;
}
