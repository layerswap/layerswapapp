import { AppSettings, KnownInternalNames } from "@layerswap/widget/internal";
import { BalanceProvider, TokenBalance } from "@layerswap/widget/types";
import * as Paradex from "@paradex/sdk";

export class ParadexBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return KnownInternalNames.Networks.ParadexMainnet.includes(network.name) || KnownInternalNames.Networks.ParadexTestnet.includes(network.name)
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network) => {
        // const environment = AppSettings.ApiVersion === 'testnet' ? 'testnet' : 'prod'
        // const config = await Paradex.Config.fetch(environment);


        // const tokens = network.tokens.filter(token => token.symbol == 'USDC');

        // const balances: TokenBalance[] = []

        // for (const token of tokens) {
        //     try {
        //         const getBalanceResult = await Paradex.Client.fromEthSigner({
        //             config,
        //             account: { address },
        //             token: token.symbol,
        //         });

        //         const balance = {
        //             network: network.name,
        //             token: token.symbol,
        //             amount: Number(getBalanceResult.size),
        //             request_time: new Date().toJSON(),
        //             decimals: Number(token?.decimals),
        //             isNativeCurrency: false
        //         }
        //         balances.push(balance)
        //     }
        //     catch (e) {
        //         balances.push(this.resolveTokenBalanceFetchError(e, token, network))
        //     }
        // }
        // return balances
        return []
    }
}
