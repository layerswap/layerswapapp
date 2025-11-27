import type { AccountInterface as AccountInterfaceOld } from 'starknet-old';
import type { AccountInterface as AccountInterfaceNew } from 'starknet';
import { Config, getParadex } from "../lib";
import { AppSettings } from '@layerswap/widget/internal';

export async function AuthorizeStarknet(starknetAccount: AccountInterfaceOld | AccountInterfaceNew, nodeUrl: string) {
    const config = await Config.fetchConfig(AppSettings.ApiVersion === "sandbox" ? 'testnet' : 'prod'); ///TODO: check environment may be mainnet

    // Get the appropriate modules based on the config's RPC version
    const paradex = getParadex(config);
    const paraclearProvider = new paradex.ParaclearProvider.DefaultProvider(config);

    const paradexAccount = await paradex.Account.fromStarknetAccount({
        provider: paraclearProvider,
        config,
        account: starknetAccount as any, // Type assertion needed due to runtime version detection
        nodeUrl,
    });

    return paradexAccount
}
