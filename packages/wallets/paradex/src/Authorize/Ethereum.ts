import { providers } from 'ethers'
import { Config, getParadex } from "../lib";
import type { TypedData } from '../lib';
import { AppSettings } from '@layerswap/widget/internal';

export default async function AuhorizeEthereum(ethersSigner: providers.JsonRpcSigner) {
    const environment = AppSettings.ApiVersion === 'testnet' ? 'testnet' : 'prod'
    const config = await Config.fetchConfig(environment);

    const paradex = getParadex(config);
    const paraclearProvider = new paradex.ParaclearProvider.DefaultProvider(config);

    function ethersSignerAdapter(signer: typeof ethersSigner) {
        return {
            async signTypedData(typedData: TypedData) {
                return await signer!._signTypedData(typedData.domain, typedData.types, typedData.message);
            },
        };
    }

    const signer = ethersSignerAdapter(ethersSigner);

    if (!signer) throw new Error('Signer not found');

    const paradexAccount = await paradex.Account.fromEthSigner({
        provider: paraclearProvider,
        config,
        signer: signer,
    });

    return paradexAccount
}
