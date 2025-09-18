import { BalanceProvider } from "@/Models/BalanceProvider";
import { TokenBalance } from "@/Models/Balance";
import { NetworkWithTokens } from "@/Models/Network";
import KnownInternalNames from "@/lib/knownIds";
import * as Paradex from "@/lib/wallets/paradex/lib";
import { insertIfNotExists } from "../helpers";

export class ParadexBalanceProvider extends BalanceProvider {
    supportsNetwork = (network: NetworkWithTokens): boolean => {
        return KnownInternalNames.Networks.ParadexMainnet.includes(network.name) || KnownInternalNames.Networks.ParadexTestnet.includes(network.name)
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {
        const environment = process.env.NEXT_PUBLIC_API_VERSION === 'sandbox' ? 'testnet' : 'prod'
        const config = await Paradex.Config.fetchConfig(environment);
        const tokens = insertIfNotExists(network.tokens || [], network.token)

        const paraclearProvider = new Paradex.ParaclearProvider.DefaultProvider(config);

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
