import { JsonRpcClient } from '@/lib/apiClients/jsonRpcClient';
import { Psbt } from 'bitcoinjs-lib'
import { Utxo } from './buildPsbt';

export const estimateFee = async (psbt: Psbt, rpcClient: JsonRpcClient, version: 'testnet' | 'mainnet', utxos: Utxo[]) => {
    const feeRate = await rpcClient.call<any[], { blocks: number, feerate: number }>('estimatesmartfee', [6, "CONSERVATIVE"])
    const satsPerVbyte = feeRate.feerate * 1e8 / 1000

    const { fee, size } = calculateOptimalFee(utxos, psbt, satsPerVbyte);
    console.log(`Estimated fee: ${fee} satoshis, size: ${size} vBytes`);
    return fee
}

function calculateOptimalFee(utxos: Utxo[], psbt: Psbt, feeRate: number) {

    // First, create a PSBT without change to estimate size
    let clonePsbt = psbt.clone();

    // Add all inputs
    let totalInput = 0;
    utxos.forEach(utxo => {
        totalInput += utxo.value;
    });

    // Add all outputs (except change)
    let totalOutput = 0;
    psbt.txOutputs.forEach(output => {
        totalOutput += Number(output.value);
    });

    // Calculate size WITHOUT change output
    const txWithoutChange = (clonePsbt as any).__CACHE.__TX;
    const sizeWithoutChange = txWithoutChange.virtualSize();

    // Estimate size WITH change output (add ~31 vBytes for P2WPKH, ~34 for P2PKH)
    const changeOutputSize = 34; // Assuming SegWit change address
    const baseFee = (4 + 4 + 1 + 1) * 4;
    const sizeWithChange = sizeWithoutChange + changeOutputSize + baseFee;

    // Calculate fees for both scenarios
    const feeWithChange = sizeWithChange * feeRate;

    // Calculate potential change
    const changeAmount = totalInput - totalOutput - feeWithChange;

    // Dust threshold (usually 546 satoshis for P2WPKH)
    const dustThreshold = 546;

    // Decision logic
    if (changeAmount < dustThreshold) {
        // No change output - fee consumes the difference
        return {
            includeChange: false,
            fee: totalInput - totalOutput,
            change: 0,
            size: sizeWithoutChange
        };
    } else if (changeAmount < dustThreshold + (changeOutputSize * feeRate)) {
        // Change is too small to justify the extra fee
        return {
            includeChange: false,
            fee: totalInput - totalOutput,
            change: 0,
            size: sizeWithoutChange
        };
    } else {
        // Include change output
        return {
            includeChange: true,
            fee: feeWithChange,
            change: changeAmount,
            size: sizeWithChange
        };
    }
}