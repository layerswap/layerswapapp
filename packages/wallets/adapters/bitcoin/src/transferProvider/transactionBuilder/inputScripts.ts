import { opcodes, payments, script as bitcoinScript, toXOnly, type Network } from 'bitcoinjs-lib'
import { sameBytes } from '../../bytes.js'

export type BitcoinInputType = 'p2wpkh' | 'p2tr' | 'p2sh-p2wpkh' | 'p2pkh'

export function bitcoinInputType(script: Uint8Array): BitcoinInputType | undefined {
  if (script.length === 22 && script[0] === opcodes.OP_0 && script[1] === 20) return 'p2wpkh'
  if (script.length === 34 && script[0] === opcodes.OP_1 && script[1] === 32) return 'p2tr'
  if (script.length === 23 && script[0] === opcodes.OP_HASH160 && script[1] === 20 && script[22] === opcodes.OP_EQUAL) return 'p2sh-p2wpkh'
  if (script.length === 25 && script[0] === opcodes.OP_DUP && script[1] === opcodes.OP_HASH160 && script[2] === 20
    && script[23] === opcodes.OP_EQUALVERIFY && script[24] === opcodes.OP_CHECKSIG) return 'p2pkh'
  return undefined
}

export function requireBitcoinInputType(script: Uint8Array): BitcoinInputType {
  const type = bitcoinInputType(script)
  if (!type) throw new Error('Unsupported Bitcoin address type; use a Native SegWit, Nested SegWit, Taproot or Legacy address')
  return type
}

const signature = new Uint8Array(73)
const compressedPublicKey = new Uint8Array(33)

export type SignedInputTemplate = { scriptSig?: Uint8Array; witness?: Uint8Array[] }

export function signedInputTemplate(type: BitcoinInputType, publicKey?: Uint8Array): SignedInputTemplate {
  switch (type) {
    case 'p2wpkh':
      return { witness: [signature, compressedPublicKey] }
    case 'p2tr':
      return { witness: [new Uint8Array(65)] }
    case 'p2sh-p2wpkh':
      return { scriptSig: bitcoinScript.compile([new Uint8Array(22)]), witness: [signature, compressedPublicKey] }
    case 'p2pkh':
      return { scriptSig: bitcoinScript.compile([signature, publicKey?.length === 65 ? publicKey : compressedPublicKey]) }
  }
}

export function signingFields(type: BitcoinInputType, script: Uint8Array, publicKey: Uint8Array | undefined, network: Network): { redeemScript?: Uint8Array; tapInternalKey?: Uint8Array } {
  if (type === 'p2sh-p2wpkh') {
    if (!publicKey) throw new Error('The wallet did not provide the public key required to sign from a Nested SegWit address')
    const redeem = payments.p2wpkh({ pubkey: publicKey, network })
    if (!redeem.output || !sameBytes(payments.p2sh({ redeem, network }).output, script)) {
      throw new Error('The wallet public key does not match its Nested SegWit address')
    }
    return { redeemScript: redeem.output }
  }

  if (type === 'p2tr' && publicKey) {
    try {
      const internalKey = publicKey.length === 32 ? publicKey : toXOnly(publicKey)
      if (sameBytes(payments.p2tr({ internalPubkey: internalKey, network }).output, script)) {
        return { tapInternalKey: internalKey }
      }
    } catch {
      return {}
    }
  }

  return {}
}
