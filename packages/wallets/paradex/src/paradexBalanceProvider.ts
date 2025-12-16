import { AppSettings, KnownInternalNames } from "@layerswap/widget/internal";
import { BalanceProvider, TokenBalance } from "@layerswap/widget/types";
import { Config, getParadex } from "./lib";

export class ParadexBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return KnownInternalNames.Networks.ParadexMainnet.includes(network.name) || KnownInternalNames.Networks.ParadexTestnet.includes(network.name)
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network) => {
        const environment = AppSettings.ApiVersion === 'testnet' ? 'testnet' : 'prod'
        const config = await Config.fetchConfig(environment);
        const paradex = getParadex(config);
        const paraclearProvider = new paradex.ParaclearProvider.DefaultProvider(config);

        const tokens = network.tokens.filter(token => token.symbol == 'USDC');

        const balances: TokenBalance[] = []

        for (const token of tokens) {
            try {
                const getBalanceResult = await paradex.Paraclear.getTokenBalance({
                    provider: paraclearProvider, //account can be passed as the provider
                    config,
                    account: { address },
                    token: token.symbol,
                });

                const balance = {
                    network: network.name,
                    token: token.symbol,
                    amount: Number(getBalanceResult.size),
                    request_time: new Date().toJSON(),
                    decimals: Number(token?.decimals),
                    isNativeCurrency: false
                }
                balances.push(balance)
            }
            catch (e) {
                balances.push(this.resolveTokenBalanceFetchError(e, token, network))
            }
        }
        return balances
    }
}
