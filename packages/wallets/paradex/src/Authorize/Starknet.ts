import { AccountInterface } from 'starknet';
import * as Paradex from "@paradex/sdk";
import { AppSettings } from "@layerswap/utils";

export async function AuthorizeStarknet(starknetAccount: AccountInterface) {
    const config = await Paradex.Config.fetch(AppSettings.ApiVersion === "testnet" ? 'testnet' : 'prod'); ///TODO: check environment may be mainnet

    const paradexAccount = await Paradex.Client.fromStarknetAccount({
        config,
        account: starknetAccount
    });

    return paradexAccount
}
