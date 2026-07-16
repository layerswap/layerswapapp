import { TokenBalance } from "../../../Models/Balance";
import KnownInternalNames from "../../knownIds";
import { LighterClient } from "../../apiClients/lighterClient";
import { LIGHTER_USDC_SYMBOL, resolveLighterNodeUrl } from "../../wallets/lighter/constants";
import { BalanceProvider } from "@/Models/BalanceProvider";

export class LighterBalanceProvider extends BalanceProvider {
    private client: LighterClient;

    constructor() {
        super()
        this.client = new LighterClient();
    }

    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return network.name === KnownInternalNames.Networks.LighterMainnet ||
            network.name === KnownInternalNames.Networks.LighterTestnet;
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, options) => {
        if (!network?.tokens && !network.token) return;

        const nodeUrl = resolveLighterNodeUrl(network.name, network.node_url);
        if (!nodeUrl) return;

        const usdcToken = network.tokens.find(token => token.symbol === LIGHTER_USDC_SYMBOL);
        if (!usdcToken) return [];

        const balances: TokenBalance[] = [];
        const available = await this.client.getWithdrawableUsdc(address, nodeUrl, options?.timeoutMs, options?.retryCount);
        balances.push({
            network: network.name,
            amount: available,
            decimals: usdcToken.decimals,
            isNativeCurrency: false,
            token: usdcToken.symbol,
            request_time: new Date().toJSON(),
        });

        return balances;
    }
}
