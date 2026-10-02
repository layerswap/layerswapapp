import type { AccountInterface, ProviderInterface } from 'starknet';
import type { StarknetWalletAccount } from '@layerswap/wallet-starknet';
import * as Paradex from "@paradex/sdk";
import { AppSettings } from "@layerswap/utils";

export async function AuthorizeStarknet(starknetAccount: StarknetWalletAccount | AccountInterface) {
    const config = await Paradex.Config.fetch(AppSettings.ApiVersion === "testnet" ? 'testnet' : 'prod'); ///TODO: check environment may be mainnet

    const paradexAccount = await Paradex.Client.fromStarknetAccount({
        config,
        // Paradex types this as a v8 account, but only uses address/signMessage.
        account: starknetAccount as AccountInterface,
        // In v10 the RPC provider lives on account.provider. Older custom
        // connections expose RPC methods on the account itself. Reuse either
        // one so Paradex never falls back to its shared public Starknet nodes.
        starknetProvider: ('provider' in starknetAccount
            ? starknetAccount.provider
            : starknetAccount) as ProviderInterface,
    });

    return paradexAccount
}
