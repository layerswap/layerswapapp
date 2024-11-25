import { NetworkBalancesProps } from "../../../Models/Balance";
import { NetworkWithTokens } from "../../../Models/Network";
import formatAmount from "../../formatAmount";

export class QueryBalanceProvider {
    private query: ReturnType<typeof import("../../../context/query").useQueryState>;
    private networks: NetworkWithTokens[];

    constructor(queryState: ReturnType<typeof import("../../../context/query").useQueryState>, networks: NetworkWithTokens[]) {
        this.query = queryState;
        this.networks = networks;
    }

    supportsNetwork(network: NetworkWithTokens): boolean {
        const supportedNetworks = this.query.balances
            ? [
                this.networks.find(l => l.name.toLowerCase() === this.query.from?.toLowerCase())?.name || '',
                this.networks.find(l => l.name.toLowerCase() === this.query.to?.toLowerCase())?.name || '',
            ].filter(Boolean)
            : [];

        return supportedNetworks.includes(network.name);
    }

    get supportedNetworks(): string[] {
        if (!this.query.balances) return [];

        return [
            this.networks.find(l => l.name.toLowerCase() === this.query.from?.toLowerCase())?.name || '',
            this.networks.find(l => l.name.toLowerCase() === this.query.to?.toLowerCase())?.name || '',
        ].filter(Boolean);
    }

    fetchBalances = async ({ networkName }: NetworkBalancesProps) => {
        const network = this.networks.find(n => n.name === networkName);

        if (!network) return null;

        const asset = network.tokens?.find(a => a.symbol === this.query.fromAsset);

        const balancesFromQueries = new URL(window.location.href.replaceAll('&quot;', '"')).searchParams.get('balances');
        const parsedBalances = balancesFromQueries && JSON.parse(balancesFromQueries);

        if (!parsedBalances || !asset) return null;

        return [{
            network: network.name,
            amount: formatAmount(parsedBalances[asset.symbol], asset.decimals),
            decimals: asset.decimals,
            isNativeCurrency: network.token?.symbol === asset.symbol,
            token: asset.symbol,
            request_time: new Date().toJSON(),
        }];
    };
}
