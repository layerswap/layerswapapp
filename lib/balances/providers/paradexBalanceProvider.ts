import { BalanceProvider } from "@/Models/BalanceProvider";
import { TokenBalance } from "@/Models/Balance";
import KnownInternalNames from "@/lib/knownIds";
import * as Paradex from "@/lib/wallets/paradex/lib";

export class ParadexBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return KnownInternalNames.Networks.ParadexMainnet.includes(network.name) || KnownInternalNames.Networks.ParadexTestnet.includes(network.name)
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network) => {
        const environment = process.env.NEXT_PUBLIC_API_VERSION === 'sandbox' ? 'testnet' : 'prod'
        const config = await Paradex.Config.fetchConfig(environment);

        const paraclearProvider = new Paradex.ParaclearProvider.DefaultProvider(config);

        const tokens = network.tokens.filter(token => token.symbol == 'USDC');

        const balances: TokenBalance[] = []

        for (const token of tokens) {
            try {
                const getBalanceResult = await Paradex.Paraclear.getTokenBalance({
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
