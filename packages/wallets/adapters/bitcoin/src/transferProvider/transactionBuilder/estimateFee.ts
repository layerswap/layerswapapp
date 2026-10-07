import { JsonRpcClient } from "@layerswap/utils";
import axios from 'axios';
import { Psbt } from 'bitcoinjs-lib'

export const estimateFee = async (psbt: Psbt, rpcClient: JsonRpcClient, version: 'testnet' | 'mainnet') => {
    const recommendedFee = await fetchRecommendedFee(version)
    const satsPerVbyte = recommendedFee.economyFee

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

export async function estimateConservativeFee(numInputs: number, version: 'mainnet' | 'testnet') {
    const { economyFee } = await fetchRecommendedFee(version);
    if (!Number.isFinite(economyFee) || economyFee <= 0) {
        throw new Error('Invalid recommended Bitcoin fee');
    }
    // Budget all single-key inputs at legacy size, two Taproot-sized outputs,
    // an 80-byte OP_RETURN memo, and serialization overhead. This also covers
    // the smaller SegWit inputs without needing an amount-dependent PSBT.
    const bytes = numInputs * 149 + 2 * 43 + 92 + 20;
    const fee = Math.ceil(bytes * economyFee);
    if (!Number.isSafeInteger(fee)) throw new Error('Invalid Bitcoin fee');
    return BigInt(fee);
}
