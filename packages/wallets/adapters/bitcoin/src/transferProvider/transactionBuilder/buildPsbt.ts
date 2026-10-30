import axios from 'axios'
import { Psbt, Transaction, address, networks, opcodes, script, initEccLib } from 'bitcoinjs-lib'
import type { TransactionBuilderParams, Utxo } from './types'
import { estimateFee, fetchFeeRate } from './estimateFee.js'
import { dustThreshold, validateOutputs } from './outputPolicy.js'
import ecc from '@bitcoinerlab/secp256k1';

initEccLib(ecc);


async function fetchUtxos(
  address: string,
  version: 'mainnet' | 'testnet',
): Promise<Utxo[]> {
  const base = `https://mempool.space${version === 'testnet' ? '/testnet' : ''}`
  const { data } = await axios.get<Utxo[]>(`${base}/api/address/${address}/utxo`)
  return data
}

async function fetchAllRawTxs(
  utxos: Utxo[],
  version: 'mainnet' | 'testnet',
): Promise<Record<string, Transaction>> {
  const base = `https://mempool.space${version === 'testnet' ? '/testnet' : ''}/api/tx/`
  const pairs = await Promise.all(
    utxos.map(u =>
      axios
        .get<string>(`${base}${u.txid}/hex`)
        .then(res => [u.txid, Transaction.fromHex(res.data)] as const),
    ),
  )
  return Object.fromEntries(pairs)
}

export async function buildPsbt(params: TransactionBuilderParams) {
  return constructPsbt(params, false)
}

/** Fee probes may use the full balance before Max has deducted the fee. */
export async function estimateBitcoinFee(params: TransactionBuilderParams): Promise<bigint> {
  const { fee } = await constructPsbt(params, true)
  return fee
}

async function constructPsbt({
  amount, depositAddress, userAddress, memo, version, feeRate,
}: TransactionBuilderParams, estimateOnly: boolean) {
  const network = version === 'testnet' ? networks.testnet : networks.bitcoin
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error('Bitcoin amount must be a positive integer in satoshis')
  }
  const depositScript = address.toOutputScript(depositAddress, network)
  const changeScript = address.toOutputScript(userAddress, network)
  validateOutputs([{ script: depositScript, value: BigInt(amount) }])
  const data = Buffer.from(memo || '', 'utf8')
  if (data.length > 80) throw new Error('Memo too long; max 80 bytes')

  const rate = feeRate ?? await fetchFeeRate(version)
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid Bitcoin fee rate')
  const utxos = await fetchUtxos(userAddress, version)
  const rawTxMap = await fetchAllRawTxs(utxos, version)
  const sorted = utxos.slice().sort((a, b) => a.value - b.value)
  const psbt = new Psbt({ network })
  psbt.addOutput({ script: depositScript, value: BigInt(amount) })
  psbt.addOutput({ script: script.compile([opcodes.OP_RETURN, data]), value: 0n })

  let total = 0n
  for (const utxo of sorted) {
    const out = rawTxMap[utxo.txid].outs[utxo.vout]
    if (!out || out.value !== BigInt(utxo.value)
      || !Buffer.from(out.script).equals(Buffer.from(changeScript))) {
      throw new Error('Bitcoin UTXO does not match its previous transaction or account')
    }
    total += out.value
    psbt.addInput({ hash: utxo.txid, index: utxo.vout, witnessUtxo: out })
    const feeWithoutChange = estimateFee(psbt, rate)
    if (total < BigInt(amount) + feeWithoutChange) continue

    // Include change in the size estimate before deciding whether it is economical.
    const withChange = psbt.clone()
    withChange.addOutput({ script: changeScript, value: 0n })
    const feeWithChange = estimateFee(withChange, rate)
    const change = total - BigInt(amount) - feeWithChange
    if (change >= dustThreshold(changeScript) && change > 0n) {
      psbt.addOutput({ script: changeScript, value: change })
    }
    // An uneconomical remainder is paid as fee; never reduce the deposit output.
    const fee = total - psbt.txOutputs.reduce((sum, output) => sum + output.value, 0n)
    validateOutputs(psbt.txOutputs)
    return { psbt, utxos, fee }
  }
  if (estimateOnly && psbt.inputCount > 0) {
    psbt.addOutput({ script: changeScript, value: 0n })
    return { psbt, utxos, fee: estimateFee(psbt, rate) }
  }
  throw new Error('Insufficient funds for Bitcoin amount and network fee')
}
