import type { GasProps, GasProvider, GasWithToken, Network } from "@layerswap/widget-types";
import { LIGHTER_QUOTED_FAST_WITHDRAW_FEE_USDC, LIGHTER_USDC_SYMBOL, isLighterNetwork } from "./constants";

/**
 * Lighter charges its fast-withdraw fee in USDC out of the withdrawn amount, so we
 * surface the quoted estimate as a "gas" fee in USDC — `resolveMaxAllowedAmount` then
 * deducts it from MAX so a one-click MAX can still cover the fee. The exact,
 * account-specific fee only comes back from the relay preflight (see ../README.md), so
 * this is deliberately the same up-front estimate the route quotes.
 */
export class LighterGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return isLighterNetwork(network.name)
    }

    getGas = async ({ token }: GasProps): Promise<GasWithToken | undefined> => {
        if (token?.symbol !== LIGHTER_USDC_SYMBOL) return undefined
        return { gas: LIGHTER_QUOTED_FAST_WITHDRAW_FEE_USDC, token }
    }
}
