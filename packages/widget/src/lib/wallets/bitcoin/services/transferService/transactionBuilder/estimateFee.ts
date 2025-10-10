import { JsonRpcClient } from '@/lib/apiClients/jsonRpcClient';
import axios from 'axios';
import { Psbt } from 'bitcoinjs-lib'

export const estimateFee = async (psbt: Psbt, rpcClient: JsonRpcClient, version: 'testnet' | 'mainnet') => {
    const recommendedFee = await fetchRecommendedFee(version)
    const satsPerVbyte = recommendedFee.minimumFee

    const fee = calculateFee(psbt.txInputs.length, psbt.txOutputs.length, satsPerVbyte);
    return fee
}

type RecommendedFeeResponse = {
    fastestFee: number,
    halfHourFee: number,
    hourFee: number,
    economyFee: number,
    minimumFee: number
}

async function fetchRecommendedFee(
    version: 'mainnet' | 'testnet',
): Promise<RecommendedFeeResponse> {
    const base = `https://mempool.space${version === 'testnet' ? '/testnet' : ''}`
    const { data } = await axios.get<RecommendedFeeResponse>(`${base}/api/v1/fees/recommended`)
    return data
}

function calculateFee(numInputs: number, numOutputs: number, feePerByte: number) {
    return (numInputs * 148 + numOutputs * 34 + 10) * feePerByte;
}