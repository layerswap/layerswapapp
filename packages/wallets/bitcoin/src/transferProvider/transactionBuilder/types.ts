import { JsonRpcClient } from "@layerswap/widget/internal";
import { BtcRpcRequestFn, Chain, Client, Transport } from "@bigmi/core";

export type TransactionBuilderParams = {
    amount: number,
    depositAddress: string,
    userAddress: string,
    memo: string,
    feeRate?: number
    version: 'mainnet' | 'testnet'
    publicClient?: Client<Transport<string, Record<string, any>, BtcRpcRequestFn>, Chain>
    rpcClient: JsonRpcClient
}

export interface Utxo {
    txid: string
    vout: number
    value: number
    status: { confirmed: boolean; block_height?: number }
}