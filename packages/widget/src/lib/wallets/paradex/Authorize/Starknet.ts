// import { AccountInterface } from 'starknet';
// import * as Paradex from "../lib";
// import AppSettings from '../../../AppSettings';

// export async function AuthorizeStarknet(starknetAccount: AccountInterface) {
//     const config = await Paradex.Config.fetchConfig(AppSettings.ApiVersion === "sandbox" ? 'testnet' : 'prod'); ///TODO: check environemnt may be mainnet

//     const paraclearProvider = new Paradex.ParaclearProvider.DefaultProvider(config);

//     const snAccount = starknetAccount

//     const paradexAccount = await Paradex.Account.fromStarknetAccount({
//         provider: paraclearProvider,
//         config,
//         account: snAccount,
//     });

//     return paradexAccount
// }
