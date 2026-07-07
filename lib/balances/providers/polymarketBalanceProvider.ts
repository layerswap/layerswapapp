import type { PublicClient } from "viem";
import { TokenBalance } from "@/Models/Balance";
import { BalanceProvider } from "@/Models/BalanceProvider";
import KnownInternalNames from "@/lib/knownIds";
import resolveChain from "@/lib/resolveChain";
import { resolveFallbackTransport } from "@/lib/resolveTransports";
import { resolvePolymarketHolding } from "@/lib/wallets/polymarket/funder";
import { POLYMARKET_DISPLAY_SYMBOL, POLYMARKET_PUSD_DECIMALS } from "@/lib/wallets/polymarket/constants";

/**
 * Polymarket balance = the user's collateral, held in a funder tied to the connected
 * owner EOA. The funder type varies (deposit wallet / Safe / proxy / legacy) and the
 * token may be pUSD or legacy USDC.e, so we check every locally-derived candidate plus
 * Polymarket's authoritative profile wallet, read both tokens, and report whatever holds
 * funds (see `resolvePolymarketHolding`). The
 * synthesized Polymarket network inherits Polygon's chain_id/nodes, so the read runs
 * against Polygon via the standard EVM public-client path.
 */
export class PolymarketBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return network.name === KnownInternalNames.Networks.PolymarketMainnet
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, options) => {
        if (!network) throw new Error("No network provided")
        const chain = resolveChain(network)
        if (!chain) throw new Error("Could not resolve chain")

        const { createPublicClient } = await import("viem")
        const publicClient = createPublicClient({
            chain,
            transport: resolveFallbackTransport(network.nodes, { retryCount: options?.retryCount, timeoutMs: options?.timeoutMs }),
        }) as PublicClient

        const holding = await resolvePolymarketHolding(address, publicClient)

        const balances: TokenBalance[] = [{
            network: network.name,
            token: POLYMARKET_DISPLAY_SYMBOL,
            amount: holding.total,
            decimals: POLYMARKET_PUSD_DECIMALS,
            isNativeCurrency: false,
            request_time: new Date().toJSON(),
        }]
        return balances
    }
}
