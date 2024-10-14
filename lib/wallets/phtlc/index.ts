import { Token } from "../../../Models/Network";
import { Commit } from "../../../Models/PHTLC";

export type CreatePreHTLCParams = {
    destinationChain: string,
    sourceChain: string,
    amount: string,
    decimals: number,
    destinationAsset: string,
    sourceAsset: Token;
    lpAddress: string;
    atomicContract: string;
    address: string;
    tokenContractAddress?: string | undefined | null;
    chainId: string;
}

export type CommitmentParams = {
    type: 'erc20' | 'native';
    id: string,
    chainId: string,
    contractAddress: `0x${string}`
}

export type LockParams = {
    type: 'erc20' | 'native';
    id: string,
    lockData?: Commit,
    hashlock: string,
    chainId: string,
    contractAddress: `0x${string}`,
    lockDataResolver?: (data: any[]) => Commit
}

export type RefundParams = {
    type: 'erc20' | 'native';
    chainId: string,
    contractAddress: `0x${string}`,
    commit: Commit
    id: string,
    hashlock?: string | undefined,
}

export type GetCommitsParams = {
    type: 'erc20' | 'native';
    contractAddress: `0x${string}`,
    chainId: string,
}