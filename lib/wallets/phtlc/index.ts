import { AssetLock } from "../../../Models/PHTLC";

export type CreatyePreHTLCParams = {
    abi: any,
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
    abi: any,
    commitId: string,
    chainId: string,
    contractAddress: `0x${string}`
}
export type LockParams = {
    abi: any,
    lockId: string,
    chainId: string,
    contractAddress: `0x${string}`,
    lockDataResolver?: (data: any[]) => AssetLock
}

export type RefundParams = {
    abi: any,
    chainId: string,
    contractAddress: `0x${string}`,
    commitId: string
    lockId?: string | null,
}