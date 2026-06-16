import { Network } from "@/Models/Network";
import KnownInternalNames from "../../knownIds";
import { HYPERLIQUID_USDC_SYMBOL } from "../../wallets/hyperliquid/constants";
import { GasProps } from "../../../Models/Balance";
import { GasProvider, GasWithToken } from "./types";

/**
 * Headroom HL reserves for the `sendToEvmWithData` HyperCore-side processing,
 * in USDC. The action requires spot balance strictly greater than the action
 * amount, so we surface this as a "gas" fee in USDC — `resolveMaxAllowedAmount`
 * then deducts it from MAX so the user can't hit the boundary with one click.
 */
const HYPERLIQUID_FEE = 0.01

export class HyperliquidGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return network.name === KnownInternalNames.Networks.HyperliquidMainnet
            || network.name === KnownInternalNames.Networks.HyperliquidTestnet
    }

    getGas = async ({ token }: GasProps): Promise<GasWithToken | undefined> => {
        if (token?.symbol !== HYPERLIQUID_USDC_SYMBOL) return undefined
        return { gas: HYPERLIQUID_FEE, token }
    }
}
