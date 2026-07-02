//@ts-ignore
import { UTXOWalletProvider } from "@bigmi/client/dist/esm/connectors/types";
import { transactionBuilder } from "./transactionBuilder";
import { Psbt } from "bitcoinjs-lib";
import { Connector } from "@bigmi/client";
import { JsonRpcClient } from "@layerswap/widget/internal";
import { BtcRpcRequestFn, Chain, Client, Transport } from "@bigmi/core";

type sendTransactionParams = {
    amount: number;
    depositAddress: string;
    userAddress: string;
    isTestnet: boolean;
    callData: string;
    connector: Connector;
    rpcClient: JsonRpcClient;
    publicClient: Client<Transport<string, Record<string, any>, BtcRpcRequestFn>, Chain>;
};

export const sendTransaction = async ({ amount, callData, depositAddress, isTestnet, publicClient, rpcClient, userAddress, connector }: sendTransactionParams) => {

    const provider = (await connector?.getProvider()) as UTXOWalletProvider;

    if (!provider) {
        throw new Error('Provider not found');
    }

    const amountInSatoshi = Math.floor(amount * 1e8);
    const hexMemo = Number(callData).toString(16);

    const { psbt, inputsToSign } = await transactionBuilder({
        amount: amountInSatoshi,
        depositAddress,
        userAddress,
        memo: hexMemo,
        version: isTestnet ? 'testnet' : 'mainnet',
        publicClient,
        rpcClient
    });

    const psbtHex = psbt.toHex();

    // Taproot addresses (bc1p/tb1p) require SIGHASH_DEFAULT (0), others use SIGHASH_ALL (1)
    const isTaproot = userAddress.startsWith('bc1p') || userAddress.startsWith('tb1p')

    const signature = await provider.request({
        method: 'signPsbt',
        params: {
            psbt: psbtHex,
            inputsToSign,
            finalize: false,
            sighashTypes: isTaproot ? [0] : [1]
        }
    })

    const signedPsbt = Psbt.fromHex(signature).finalizeAllInputs()
    const tx = signedPsbt.extractTransaction()
    const txHex = tx.toHex();

    const txHash = await rpcClient.call<string[], string>('sendrawtransaction', [txHex]);

    return txHash;

}