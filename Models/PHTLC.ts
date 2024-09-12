export type Commit = {
    dstAddress: string,
    dstChain: string,
    dstAsset: string,
    srcAsset: string,
    sender: string,
    srcReceiver: string,
    timelock: number,
    amount: number,
    messenger: string,
    locked: boolean,
    lockId: string | undefined,
    uncommitted: boolean
}

export type AssetLock = {
    dstAddress?: string,
    dstChain?: string,
    dstAsset?: string,
    srcAsset?: string,
    sender: string,
    srcReceiver: string,
    hashlock: string,
    secret: number,
    amount: number,
    timelock: number,
    redeemed: boolean,
    unlocked: boolean,
}
