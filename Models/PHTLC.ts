export type Commit = {
    sender: string,
    srcReceiver: string,
    timelock: number,
    amount: number,
    id?: string | undefined,
    hashlock: string | undefined,
    secret: number | undefined,
    claimed: number,
}