
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
}

export type CommitmentParams = {
    commitId: string,
    chainId: string,
    contractAddress: `0x${string}`
}