import { NetworkWithTokens } from "@/Models/Network";
import { TokenBalance } from "@/Models/Balance";
import KnownInternalNames from "../../../knownIds";
import { HyperliquidClient } from "../../../apiClients/hyperliquidClient";
import { BalanceProvider } from "@/types/balance";

export class HyperliquidBalanceProvider extends BalanceProvider {
    private client: HyperliquidClient;

    constructor() {
        super()
        this.client = new HyperliquidClient();
    }

    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return network.name === KnownInternalNames.Networks.HyperliquidMainnet ||
            network.name === KnownInternalNames.Networks.HyperliquidTestnet;
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, options) => {
        if (!network?.tokens && !network.token) return;

        try {
            var nodeUrl = network.node_url;
            if (nodeUrl == null) {
                nodeUrl = network.name == KnownInternalNames.Networks.HyperliquidMainnet
                    ? "https://api.hyperliquid.xyz" : "https://api.hyperliquid-testnet.xyz";
            }

            const clearinghouseState = await this.client.getClearinghouseState(address, nodeUrl, options?.timeoutMs, options?.retryCount);

            const balances: TokenBalance[] = [];

            // Only support USDC balances for now
            const usdcToken = network.tokens.find(token => token.symbol === 'USDC');

            if (usdcToken) {
                const withdrawableAmount = parseFloat(clearinghouseState.withdrawable);
                if (withdrawableAmount > 0) {
                    balances.push({
                        network: network.name,
                        amount: withdrawableAmount,
                        decimals: usdcToken.decimals,
                        isNativeCurrency: false,
                        token: usdcToken.symbol,
                        request_time: new Date().toJSON(),
                    });
                }
            }

            return balances;
        } catch (error) {
            return network.tokens.map(t => this.resolveTokenBalanceFetchError(error, t, network))
        }
    }
}