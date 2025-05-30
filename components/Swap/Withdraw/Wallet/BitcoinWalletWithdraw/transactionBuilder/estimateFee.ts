import { JsonRpcClient } from '@/lib/apiClients/jsonRpcClient';
import { Psbt } from 'bitcoinjs-lib'

export const estimateFee = async (psbt: Psbt, rpcClient: JsonRpcClient, version: 'testnet' | 'mainnet') => {
    const feeRate = await rpcClient.call<any[], { blocks: number, feerate: number }>('estimatesmartfee', [6, "CONSERVATIVE"])
    const satsPerVbyte = feeRate.feerate * 1e8 / 1000

    const fee = calculateFee(psbt.txInputs.length, psbt.txOutputs.length, satsPerVbyte);
    return fee
}

function calculateFee(numInputs: number, numOutputs: number, feePerByte: number) {
    return (numInputs * 148 + numOutputs * 34 + 10) * feePerByte;
}