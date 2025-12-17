import { AccountInterface } from 'starknet';
import * as Paradex from "@paradex/sdk";
import { AppSettings } from '@layerswap/widget/internal';

export async function AuthorizeStarknet(starknetAccount: AccountInterface) {
    const config = await Paradex.Config.fetch(AppSettings.ApiVersion === "sandbox" ? 'testnet' : 'prod'); ///TODO: check environment may be mainnet

    const paradexAccount = await Paradex.Client.fromStarknetAccount({
        config,
        account: starknetAccount
    });

    return paradexAccount
}
