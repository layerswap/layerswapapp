import { KnownInternalNames, fetchWithTimeout, retry } from "@layerswap/widget/internal";
import { BalanceProvider, TokenBalance } from "@layerswap/widget/types";

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
                if (withdrawableAmount >= 0) {
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
            throw error
        }
    }
}

interface ClearinghouseState {
    assetPositions: {
        position: {
            coin: string;
            cumFunding: {
                allTime: string;
                sinceChange: string;
                sinceOpen: string;
            };
            entryPx: string;
            leverage: {
                type: string;
                value: number;
                rawUsd: string;
            };
            liquidationPx: string | null;
            marginUsed: string;
            maxLeverage: number;
            notionalPosition: string;
            returnOnEquity: string;
            szi: string;
            unrealizedPnl: string;
        };
        type: string;
    }[];
    crossMaintenanceMarginUsed: string;
    crossMarginSummary: {
        accountValue: string;
        totalMarginUsed: string;
        totalNtlPos: string;
        totalRawUsd: string;
    };
    marginsummary: {
        accountValue: string;
        totalMarginUsed: string;
        totalNtlPos: string;
        totalRawUsd: string;
    };
    time: number;
    withdrawable: string;
}

export class HyperliquidClient {
    async getClearinghouseState(user: string, nodeUrl: string, timeoutMs?: number, retryCount?: number): Promise<ClearinghouseState> {
        const response = await retry(async () => await fetchWithTimeout(`${nodeUrl}/info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'clearinghouseState',
                user: user,
            }),
            timeoutMs: timeoutMs ?? 60000,
        }), retryCount ?? 3, 500);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }
}