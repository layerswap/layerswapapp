import axios from 'axios'
import { opcodes, Transaction, type Psbt } from 'bitcoinjs-lib'

// Reserve room for the largest signatures and the compressed SegWit public key.
const segwitWitness = [new Uint8Array(73), new Uint8Array(33)]
const taprootWitness = [new Uint8Array(65)] // Key-path signature with optional sighash byte.

export async function fetchFeeRate(version: 'testnet' | 'mainnet'): Promise<number> {
  const base = `https://mempool.space${version === 'testnet' ? '/testnet' : ''}`
  const { data } = await axios.get<{ economyFee: number; minimumFee: number }>(`${base}/api/v1/fees/recommended`)
  const rate = Math.max(data.economyFee, data.minimumFee)
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid Bitcoin fee rate')
  return rate
}

export function estimateFee(psbt: Psbt, feeRate: number): bigint {
  if (!Number.isFinite(feeRate) || feeRate <= 0) throw new Error('Invalid Bitcoin fee rate')

  // Model the signed size without modifying the PSBT sent to the wallet.
  const sizedTransaction = new Transaction()
  psbt.txInputs.forEach(({ hash, index, sequence }, inputIndex) => {
    const script = psbt.data.inputs[inputIndex].witnessUtxo?.script
    sizedTransaction.addInput(hash, index, sequence)

    if (script?.length === 22 && script[0] === opcodes.OP_0 && script[1] === 20) {
      sizedTransaction.setWitness(inputIndex, segwitWitness)
    } else if (script?.length === 34 && script[0] === opcodes.OP_1 && script[1] === 32) {
      sizedTransaction.setWitness(inputIndex, taprootWitness)
    } else {
      throw new Error('Unsupported Bitcoin input script; use a native SegWit or Taproot account')
    }
  })

  for (const { script, value } of psbt.txOutputs) {
    sizedTransaction.addOutput(script, value)
  }

  return BigInt(Math.ceil(sizedTransaction.virtualSize() * feeRate))
}
