import { NetworkType } from '@layerswap/widget-types';
import { HYPERLIQUID_USDC_SYMBOL, HYPERLIQUID_WITHDRAW_HEADROOM } from "./constants";
import { Network } from "@layerswap/widget-types";
import { GasProps, GasProvider, GasWithToken } from "@layerswap/widget-types";

/**
 * Headroom HL reserves for the `sendToEvmWithData` HyperCore-side processing, in
 * USDC. The action requires the source pool balance strictly greater than the
 * action amount, so we surface this as a "gas" fee in USDC — `resolveMaxAllowedAmount`
 * then deducts it from MAX so the user can't hit the boundary with one click.
 * Shared with the withdrawal flow (`HYPERLIQUID_WITHDRAW_HEADROOM`) so MAX and the
 * flow's source-pool `required` math stay in lockstep.
 */
export class HyperliquidGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return network.type === NetworkType.Hyperliquid
    }

    getGas = async ({ token }: GasProps): Promise<GasWithToken | undefined> => {
        if (token?.symbol !== HYPERLIQUID_USDC_SYMBOL) return undefined
        return { gas: HYPERLIQUID_WITHDRAW_HEADROOM, token }
    }
}
