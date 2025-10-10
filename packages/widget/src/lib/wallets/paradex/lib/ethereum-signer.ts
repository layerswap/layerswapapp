import type { ethers, providers } from 'ethers';

export interface TypedData {
    readonly domain: {
        readonly name: string;
        readonly version: string;
        readonly chainId: string;
    };
    readonly primaryType: string;
    readonly types: Record<
        string,
        Array<{
            readonly name: string;
            readonly type: string;
        }>
    >;
    readonly message: Record<string, unknown>;
}

export interface EthereumSigner {
    readonly signTypedData: (typedData: TypedData) => Promise<string>;
}

export function ethersSignerAdapter(
    ethersSigner: providers.JsonRpcSigner,
): EthereumSigner {
    return {
        async signTypedData(typedData) {
            return await ethersSigner._signTypedData(
                typedData.domain,
                typedData.types,
                typedData.message,
            );
        },
    };
}
/**
 * Returns the typed data that needs to be signed by an Ethereum
 * wallet in order to generate a Paradex account.
 * @returns The typed data object.
 */
export function buildEthereumStarkKeyTypedData(
    ethereumChainId: string,
): TypedData {
    return {
        domain: {
            name: 'Paradex',
            chainId: ethereumChainId,
            version: '1',
        },
        primaryType: 'Constant',
        types: {
            Constant: [{ name: 'action', type: 'string' }],
        },
        message: {
            action: 'STARK Key',
        },
    };
}