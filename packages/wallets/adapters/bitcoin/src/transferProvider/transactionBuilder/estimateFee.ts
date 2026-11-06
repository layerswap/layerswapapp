import axios from 'axios'
import type { Psbt } from 'bitcoinjs-lib'
import { compactSizeLength, outputSize } from './outputPolicy.js'

export async function fetchFeeRate(version: 'testnet' | 'mainnet'): Promise<number> {
  const base = `https://mempool.space${version === 'testnet' ? '/testnet' : ''}`
  const { data } = await axios.get<{ economyFee: number; minimumFee: number }>(`${base}/api/v1/fees/recommended`)
  const rate = Math.max(data.economyFee, data.minimumFee)
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid Bitcoin fee rate')
  return rate
}

/** Conservative signed size for the native SegWit inputs this builder supports. */
export function estimateFee(psbt: Psbt, feeRate: number): bigint {
  if (!Number.isFinite(feeRate) || feeRate <= 0) throw new Error('Invalid Bitcoin fee rate')
  let witnessBytes = 2 // SegWit marker and flag
  for (const input of psbt.data.inputs) {
    const script = input.witnessUtxo?.script
    if (script?.length === 22 && script[0] === 0 && script[1] === 20) {
      witnessBytes += 109 // two items: maximum DER signature + compressed public key
    } else if (script?.length === 34 && script[0] === 0x51 && script[1] === 32) {
      witnessBytes += 67 // key-path signature, including an optional sighash byte
    } else {
      throw new Error('Unsupported Bitcoin input script; use a native SegWit or Taproot account')
    }
  }
  const baseBytes = 8 + compactSizeLength(psbt.inputCount) + compactSizeLength(psbt.txOutputs.length)
    + psbt.inputCount * 41 + psbt.txOutputs.reduce((sum, output) => sum + outputSize(output.script), 0)
  const vsize = Math.ceil((baseBytes * 4 + witnessBytes) / 4)
  return BigInt(Math.ceil(vsize * feeRate))
}
