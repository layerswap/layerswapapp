import { script as bitcoinScript, opcodes } from 'bitcoinjs-lib'

function compactSizeLength(value: number): number {
  return value < 253 ? 1 : value <= 0xffff ? 3 : value <= 0xffffffff ? 5 : 9
}

export function outputSize(script: Uint8Array): number {
  return 8 + compactSizeLength(script.length) + script.length
}

/** Bitcoin Core's default dust relay policy: 3 sat/vB, distinct from mining fees. */
export function dustThreshold(script: Uint8Array): bigint {
  if (script[0] === opcodes.OP_RETURN) return 0n
  const chunks = bitcoinScript.decompile(script)
  const isWitness = chunks?.length === 2
    && typeof chunks[0] === 'number'
    && (chunks[0] === opcodes.OP_0 || (chunks[0] >= opcodes.OP_1 && chunks[0] <= opcodes.OP_16))
    && chunks[1] instanceof Uint8Array
    && chunks[1].length >= 2 && chunks[1].length <= 40
  return BigInt((outputSize(script) + (isWitness ? 67 : 148)) * 3)
}

export function validateOutputs(outputs: ReadonlyArray<{ script: Uint8Array; value: bigint }>): void {
  outputs.forEach((output, index) => {
    const threshold = dustThreshold(output.script)
    if (output.value < threshold) {
      throw new Error(`Dust output ${index}: ${output.value} sats, minimum ${threshold}, script ${Buffer.from(output.script).toString('hex')}`)
    }
  })
}

export { compactSizeLength }
