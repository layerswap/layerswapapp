import axios from 'axios'
import type { SignedInputTemplate } from './inputScripts.js'
import { compactSizeLength } from './outputPolicy.js'

export async function fetchFeeRate(version: 'testnet' | 'mainnet'): Promise<number> {
  const base = `https://mempool.space${version === 'testnet' ? '/testnet' : ''}`
  const { data } = await axios.get<{ economyFee: number; minimumFee: number }>(`${base}/api/v1/fees/recommended`)
  const rate = Math.max(data.economyFee, data.minimumFee)
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid Bitcoin fee rate')
  return rate
}

export function estimateHomogeneousFee(inputCount: number, input: SignedInputTemplate, outputScripts: readonly Uint8Array[], feeRate: number): bigint {
  const scriptSigLength = input.scriptSig?.length ?? 0
  const inputBytes = 32 + 4 + compactSizeLength(scriptSigLength) + scriptSigLength + 4
  const outputBytes = outputScripts.reduce((total, script) => total + 8 + compactSizeLength(script.length) + script.length, 0)
  const baseBytes = 4 + compactSizeLength(inputCount) + inputCount * inputBytes
    + compactSizeLength(outputScripts.length) + outputBytes + 4
  const witnessBytes = input.witness && inputCount > 0
    ? 2 + inputCount * input.witness.reduce(
      (total, item) => total + compactSizeLength(item.length) + item.length,
      compactSizeLength(input.witness.length),
    )
    : 0

  return BigInt(Math.ceil(Math.ceil((baseBytes * 4 + witnessBytes) / 4) * feeRate))
}
