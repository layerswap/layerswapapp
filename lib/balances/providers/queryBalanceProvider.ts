import { BalanceProvider } from "@/Models/BalanceProvider";
import { NetworkWithTokens } from "../../../Models/Network";
import { formatUnits } from "viem";
import { insertIfNotExists } from "../helpers";

export class QueryBalanceProvider extends BalanceProvider {
    private query: {
        from?: string | null;
        to?: string | null;
        balances?: string | null;
        fromAsset?: string | null;
    };

    constructor() {
        super();
        this.query = this.getQueryParams();
    }

    private getQueryParams() {
        if (typeof window === "undefined" || typeof location === "undefined") {
            // Return default or empty query params if not in a browser environment
            return {
                from: null,
                to: null,
                balances: null,
                fromAsset: null,
            };
        }

        const urlParams = new URLSearchParams(location.search);
        return {
            from: urlParams.get('from'),
            to: urlParams.get('to'),
            balances: urlParams.get('balances'),
            fromAsset: urlParams.get('fromAsset'),
        };
    }

    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        if (!this.query.balances) return false
        return network?.name?.toLocaleLowerCase() === this.query.from?.toLowerCase() || network?.name?.toLocaleLowerCase() === this.query.to?.toLowerCase()
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (_, network) => {
        if (!network) return null;
        const tokens = insertIfNotExists(network.tokens || [], network.token)

        const asset = tokens?.find(a => a.symbol === this.query.fromAsset);
        const balancesFromQueries = this.query.balances ? JSON.parse(this.query.balances) : null;

        if (!balancesFromQueries || !asset) return null;

        return [{
            network: network.name,
            amount: Number(formatUnits(BigInt(balancesFromQueries[asset.symbol]), asset.decimals)),
            decimals: asset.decimals,
            isNativeCurrency: network.token?.symbol === asset.symbol,
            token: asset.symbol,
            request_time: new Date().toJSON(),
        }];
    };
}
