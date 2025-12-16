import { providers } from 'ethers'
import * as Paradex from "@paradex/sdk";
import { TypedData } from '../lib/types';

export default async function AuhorizeEthereum(ethersSigner: providers.JsonRpcSigner) {
    const environment = process.env.NEXT_PUBLIC_API_VERSION === 'sandbox' ? 'testnet' : 'prod'
    const config = await Paradex.Config.fetch(environment);

    function ethersSignerAdapter(signer: typeof ethersSigner) {
        return {
            async signTypedData(typedData: TypedData) {
                return await signer!._signTypedData(typedData.domain, typedData.types, typedData.message);
            },
        };
    }

    const signer = ethersSignerAdapter(ethersSigner);

    if (!signer) throw new Error('Signer not found');

    const paradexAccount = await Paradex.Client.fromEthSigner({
        config,
        signer: signer,
    });

    return paradexAccount
}
