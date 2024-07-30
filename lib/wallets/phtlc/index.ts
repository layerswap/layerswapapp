import { AssetLock } from "../../../Models/PHTLC";

export type CreatyePreHTLCParams = {
    destinationChain: string,
    sourceChain: string,
    amount: string,
    decimals: number,
    destinationAsset: string,
    sourceAsset: string;
    lpAddress: string;
    atomicContrcat: `0x${string}`;
    address: string;
    tokenContractAddress?: string | undefined | null;
    chainId: string;
}

export type CommitmentParams = {
    commitId: string,
    chainId: string,
    contractAddress: `0x${string}`
}

export type LockParams = {
    lockId: string,
    chainId: string,
    contractAddress: `0x${string}`,
    lockDataResolver?: (data: any[]) => AssetLock
}
export type GetCommitsParams = {
    contractAddress: `0x${string}`,
    chainId: string,
}