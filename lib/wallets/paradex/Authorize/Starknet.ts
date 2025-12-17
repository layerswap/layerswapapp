import { AccountInterface } from 'starknet';
import * as Paradex from "@paradex/sdk";

export async function AuthorizeStarknet(starknetAccount: AccountInterface) {
    const config = await Paradex.Config.fetch(process.env.NEXT_PUBLIC_API_VERSION === "sandbox" ? 'testnet' : 'prod'); ///TODO: check environment may be mainnet

    const paradexAccount = await Paradex.Client.fromStarknetAccount({
        config,
        account: starknetAccount
    });

    return paradexAccount
}
