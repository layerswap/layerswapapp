//@ts-ignore
import { UTXOWalletProvider } from "@bigmi/client/dist/esm/connectors/types";
import { transactionBuilder } from "./transactionBuilder";
import { dustThreshold, validateOutputs } from "./transactionBuilder/outputPolicy";
import { Psbt } from "bitcoinjs-lib";
import { Connector } from "@bigmi/client";
import { JsonRpcClient } from "@layerswap/utils";
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
    const raw = String(callData);
    const semi = raw.indexOf(";");
    const seq = semi === -1 ? raw : raw.slice(0, semi);
    const tail = semi === -1 ? "" : raw.slice(semi);

    const hexMemo = BigInt(seq).toString(16) + tail;

    const { psbt, inputsToSign } = await transactionBuilder({
        amount: amountInSatoshi,
        depositAddress,
        userAddress,
        memo: hexMemo,
        version: isTestnet ? 'testnet' : 'mainnet',
        publicClient,
        rpcClient
    });

    validateOutputs(psbt.txOutputs);
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

    const signedPsbt = Psbt.fromHex(signature)

    // Some wallets (e.g. MetaMask) return an already-finalized PSBT; only finalize inputs that still need it
    signedPsbt.data.inputs.forEach((input, index) => {
        if (!input.finalScriptSig && !input.finalScriptWitness) {
            signedPsbt.finalizeInput(index)
        }
    })

    const tx = signedPsbt.extractTransaction()
    validateOutputs(tx.outs);
    const txHex = tx.toHex();

    try {
        return await rpcClient.call<string[], string>('sendrawtransaction', [txHex]);
    } catch (cause) {
        // Include amounts and scripts, but never the signed transaction or witness data.
        const outputs = tx.outs.map((output, index) => ({
            index,
            role: index === 0 ? 'deposit' : index === 1 ? 'memo' : 'change',
            sats: output.value.toString(),
            script: Buffer.from(output.script).toString('hex'),
            dustThreshold: dustThreshold(output.script).toString(),
        }));
        const inputTotal = signedPsbt.data.inputs.reduce((sum, input) => sum + (input.witnessUtxo?.value ?? 0n), 0n);
        const outputTotal = tx.outs.reduce((sum, output) => sum + output.value, 0n);
        const fee = inputTotal - outputTotal;
        const message = cause instanceof Error ? cause.message : String(cause);
        throw new Error(`${message}; Bitcoin transaction diagnostics: ${JSON.stringify({
            outputs, inputSats: inputTotal.toString(), feeSats: fee.toString(), vsize: tx.virtualSize(),
        })}`, { cause });
    }

}