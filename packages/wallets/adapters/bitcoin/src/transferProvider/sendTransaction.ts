//@ts-ignore
import { UTXOWalletProvider } from "@bigmi/client/dist/esm/connectors/types";
import { bitcoinAmountInSatoshis } from "../bitcoinAmount.js";
import { transactionBuilder } from "./transactionBuilder/index.js";
import { bitcoinMemo } from "./bitcoinMemo.js";
import { sameBytes } from "../bytes.js";
import { Psbt } from "bitcoinjs-lib";
import { Connector } from "@bigmi/client";
import { JsonRpcClient } from "@layerswap/utils";

type sendTransactionParams = {
    amount: number;
    amountInBaseUnits?: string;
    reviewFee?: (fee: bigint, requiredFee: bigint) => Promise<void>;
    onWalletPrompt?: () => void;
    depositAddress: string;
    userAddress: string;
    publicKey?: string;
    isTestnet: boolean;
    callData: string;
    connector: Connector;
    rpcClient: JsonRpcClient;
};

export const sendTransaction = async ({ amount, amountInBaseUnits, reviewFee, onWalletPrompt, callData, depositAddress, isTestnet, rpcClient, userAddress, publicKey, connector }: sendTransactionParams) => {

    const provider = (await connector?.getProvider()) as UTXOWalletProvider;

    if (!provider) {
        throw new Error('Provider not found');
    }

    const amountInSatoshi = bitcoinAmountInSatoshis(amount, amountInBaseUnits);
    const hexMemo = bitcoinMemo(callData);

    const { psbt, inputsToSign, fee, requiredFee } = await transactionBuilder({
        amount: amountInSatoshi,
        depositAddress,
        userAddress,
        publicKey,
        memo: hexMemo,
        version: isTestnet ? 'testnet' : 'mainnet',
    });

    const psbtHex = psbt.toHex();

    const isTaproot = inputsToSign[0]?.sigHash === 0

    await reviewFee?.(fee, requiredFee);

    onWalletPrompt?.();
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
    if (!sameBytes(psbt.data.globalMap.unsignedTx.toBuffer(), signedPsbt.data.globalMap.unsignedTx.toBuffer())) {
        throw new Error('The wallet changed the prepared Bitcoin transaction')
    }

    // Some wallets (e.g. MetaMask) return an already-finalized PSBT; only finalize inputs that still need it
    signedPsbt.data.inputs.forEach((input, index) => {
        if (!input.finalScriptSig && !input.finalScriptWitness) {
            signedPsbt.finalizeInput(index)
        }
    })

    const tx = signedPsbt.extractTransaction()
    const txHex = tx.toHex();

    return await rpcClient.call<string[], string>('sendrawtransaction', [txHex]);
}