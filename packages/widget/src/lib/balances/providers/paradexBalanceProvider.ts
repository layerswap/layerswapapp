// import { Balance } from "../../../Models/Balance";
// import { NetworkWithTokens } from "../../../Models/Network";
// import AppSettings from "../../AppSettings";
// import KnownInternalNames from "../../knownIds";
// import * as Paradex from "../../wallets/paradex/lib";
// import { insertIfNotExists } from "./helpers";

// export class ParadexBalanceProvider {
//     supportsNetwork(network: NetworkWithTokens): boolean {
//         return KnownInternalNames.Networks.ParadexMainnet.includes(network.name) || KnownInternalNames.Networks.ParadexTestnet.includes(network.name)
//     }

//     fetchBalance = async (address: string, network: NetworkWithTokens) => {

//         try {
//             const environment = AppSettings.ApiVersion === 'sandbox' ? 'testnet' : 'prod'
//             const config = await Paradex.Config.fetchConfig(environment);
//             const tokens = insertIfNotExists(network.tokens || [], network.token)

//             const paraclearProvider = new Paradex.ParaclearProvider.DefaultProvider(config);

//             const result: Balance[] = []

//             for (const token of tokens) {

//                 const getBalanceResult = await Paradex.Paraclear.getTokenBalance({
//                     provider: paraclearProvider, //account can be passed as the provider
//                     config,
//                     account: { address },
//                     token: token.symbol,
//                 });
                
//                 const balance = {
//                     network: network.name,
//                     token: token.symbol,
//                     amount: Number(getBalanceResult.size),
//                     request_time: new Date().toJSON(),
//                     decimals: Number(token?.decimals),
//                     isNativeCurrency: false
//                 }
//                 result.push(balance)

//             }
//             return result
//         }
//         catch (e) {
//             console.log(e)
//             throw e
//         }
//     }
// }
