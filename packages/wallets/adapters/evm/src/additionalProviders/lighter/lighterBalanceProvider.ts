import { BalanceProvider, type TokenBalance } from "@layerswap/widget-types";
import { LighterClient } from "./lighterClient";
import { LIGHTER_USDC_SYMBOL, isLighterNetwork, resolveLighterNodeUrl } from "./constants";

export class LighterBalanceProvider extends BalanceProvider {
    private client: LighterClient;

    constructor() {
        super()
        this.client = new LighterClient();
    }

    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return isLighterNetwork(network.name);
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, options) => {
        if (!network?.tokens && !network.token) return;

        // Route the settings `node_url` through the same allowlist the withdrawal flow
        // uses — an attacker-controlled override could otherwise feed forged balances.
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
