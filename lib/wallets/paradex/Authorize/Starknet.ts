import { AccountInterface } from 'starknet';
import * as Paradex from "../lib";

export async function AuthorizeStarknet(starknetAccount: AccountInterface) {
    const config = await Paradex.Config.fetchConfig(process.env.NEXT_PUBLIC_API_VERSION === "sandbox" ? 'testnet' : 'prod'); ///TODO: check environemnt may be mainnet

    const paraclearProvider = new Paradex.ParaclearProvider.DefaultProvider(config);

    const snAccount = starknetAccount

    const paradexAccount = await Paradex.Account.fromStarknetAccount({
        provider: paraclearProvider,
        config,
        account: snAccount,
    });

    return paradexAccount
}
