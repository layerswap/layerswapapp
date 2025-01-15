import type { ethers } from 'ethers';

export type Hex = `0x${string}`;

export interface TypedData {
    readonly domain: {
        readonly name: string;
        readonly version: string;
        readonly chainId: string;
    };
    readonly primaryType: string;
    readonly types: Record<string, Array<{
        readonly name: string;
        readonly type: string;
    }>>;
    readonly message: Record<string, unknown>;
}
export interface EthereumSigner {
    readonly signTypedData: (typedData: TypedData) => Promise<string>;
}
export declare function ethersSignerAdapter(ethersSigner: ethers.Signer): EthereumSigner;
/**
 * Returns the typed data that needs to be signed by an Ethereum
 * wallet in order to generate a Paradex account.
 * @returns The typed data object.
 */
export declare function buildEthereumStarkKeyTypedData(ethereumChainId: string): TypedData;
