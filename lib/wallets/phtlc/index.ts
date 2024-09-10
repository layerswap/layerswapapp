import { Token } from "../../../Models/Network";
import { AssetLock, Commit } from "../../../Models/PHTLC";

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
    commitId: string,
    chainId: string,
    contractAddress: `0x${string}`
}

export type LockParams = {
    type: 'erc20' | 'native';
    lockId: string,
    lockData?: AssetLock,
    chainId: string,
    contractAddress: `0x${string}`,
    lockDataResolver?: (data: any[]) => AssetLock
}

export type RefundParams = {
    type: 'erc20' | 'native';
    chainId: string,
    contractAddress: `0x${string}`,
    commit: Commit
    commitId: string,
    lockId?: string | null,
}

export type GetCommitsParams = {
    type: 'erc20' | 'native';
    contractAddress: `0x${string}`,
    chainId: string,
}