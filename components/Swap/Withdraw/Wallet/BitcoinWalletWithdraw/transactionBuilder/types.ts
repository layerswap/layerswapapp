import { JsonRpcClient } from "@/lib/apiClients/jsonRpcClient";
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