export type TransactionBuilderParams = {
    amount: number,
    depositAddress: string,
    userAddress: string,
    publicKey?: string,
    memo: string,
    feeRate?: number
    version: 'mainnet' | 'testnet'
}

export interface Utxo {
    txid: string
    vout: number
    value: number
    status: { confirmed: boolean; block_height?: number }
}