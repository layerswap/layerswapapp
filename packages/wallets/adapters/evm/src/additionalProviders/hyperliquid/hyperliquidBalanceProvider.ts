import { NetworkType } from '@layerswap/widget-types';
import { BalanceProvider, TokenBalance } from "@layerswap/widget-types";
import { resolveHyperliquidNodeUrl, HYPERLIQUID_USDC_SYMBOL } from "./constants";
import { HyperliquidClient } from "./hyperliquidClient";
import { formatUnits } from "viem";

export class HyperliquidBalanceProvider extends BalanceProvider {
    private client: HyperliquidClient;

    constructor() {
        super()
        this.client = new HyperliquidClient();
    }

    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return network.type === NetworkType.Hyperliquid;
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, options) => {
        if (!network?.tokens && !network.token) return;

        try {
            // Route the settings `node_url` through the same allowlist the
            // withdrawal flow uses — an attacker-controlled override could
            // otherwise feed forged balances here. Falls back to the route default.
            const nodeUrl = resolveHyperliquidNodeUrl(network.name, network.node_url);
            if (!nodeUrl) return;

            const balances: TokenBalance[] = [];

            // Only support USDC balances for now
            const usdcToken = network.tokens.find(token => token.symbol === HYPERLIQUID_USDC_SYMBOL);

            if (usdcToken) {
                // Report the combined withdrawable across both HyperCore pools (spot
                // available + perps withdrawable). The withdrawal flow can pull from
                // either pool — and consolidate between them — so the user's spendable
                // balance is the sum, not spot alone.
                const decimals = usdcToken.decimals ?? 6;
                const split = await this.client.getWithdrawableSplit(address, nodeUrl, usdcToken.symbol, decimals, options?.timeoutMs, options?.retryCount);
                if (split.combined >= 0n) {
                    balances.push({
                        network: network.name,
                        amount: Number(formatUnits(split.combined, decimals)),
                        decimals: usdcToken.decimals,
                        isNativeCurrency: false,
                        token: usdcToken.symbol,
                        request_time: new Date().toJSON(),
                    });
                }
            }

            return balances;
        } catch (error) {
            throw error
        }
    }
}
