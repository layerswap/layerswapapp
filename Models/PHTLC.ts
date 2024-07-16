export type Commit = {
    dstAddress: `0x${string}`
    dstChain: string,
    dstAsset: string,
    srcAsset: string,
    srcReciever: `0x${string}`
    timelock: number,
    amount: number,
    messanger: `0x${string}`
}