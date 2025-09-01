import { NetworkWithTokens } from "../../../Models/Network";
import { Balance } from "../../../Models/Balance";
import KnownInternalNames from "../../knownIds";
import { HyperliquidClient } from "../../apiClients/hyperliquidClient";

export class HyperliquidBalanceProvider {
    private client: HyperliquidClient;

    constructor() {
        this.client = new HyperliquidClient();
    }

    supportsNetwork(network: NetworkWithTokens): boolean {
        return network.name === KnownInternalNames.Networks.HyperliquidMainnet ||
            network.name === KnownInternalNames.Networks.HyperliquidTestnet;
    }

    fetchBalance = async (address: string, network: NetworkWithTokens): Promise<Balance[] | undefined> => {
        if (!network?.tokens && !network.token) return;

        try {
            var nodeUrl = network.node_url;
            if (nodeUrl == null) {
                nodeUrl = network.name == KnownInternalNames.Networks.HyperliquidMainnet
                    ? "https://api.hyperliquid.xyz" : "https://api.hyperliquid-testnet.xyz";
            }

            const clearinghouseState = await this.client.getClearinghouseState(address, nodeUrl);

            const balances: Balance[] = [];

            // Only support USDC balances for now
            const usdcToken = network.tokens.find(token => token.symbol === 'USDC');
            
            if (usdcToken) {
                const withdrawableAmount = parseFloat(clearinghouseState.withdrawable);
                if (withdrawableAmount > 0) {
                    balances.push({
                        network: network.name,
                        amount: withdrawableAmount,
                        decimals: usdcToken.decimals,
                        isNativeCurrency: true,
                        token: usdcToken.symbol,
                        request_time: new Date().toJSON(),
                    });
                }
            }

            return balances;
        } catch (error) {
            console.error('Error fetching Hyperliquid balances:', error);
            return undefined;
        }
    }
}