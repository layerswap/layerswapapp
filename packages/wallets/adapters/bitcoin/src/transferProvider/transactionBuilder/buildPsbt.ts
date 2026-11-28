import axios from 'axios'
import { Psbt, Transaction, address, networks, opcodes, script, initEccLib } from 'bitcoinjs-lib'
import type { TransactionBuilderParams, Utxo } from './types'
import { estimateHomogeneousFee, fetchFeeRate } from './estimateFee.js'
import { dustThreshold } from './outputPolicy.js'
import { requireBitcoinInputType, signedInputTemplate, signingFields } from './inputScripts.js'
import { hexToBytes, sameBytes } from '../../bytes.js'
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
    [...new Set(utxos.map(u => u.txid))].map(txid =>
      axios
        .get<string>(`${base}${txid}/hex`)
        .then(res => {
          const transaction = Transaction.fromHex(res.data)
          if (transaction.getId() !== txid) throw new Error('Bitcoin previous transaction does not match its id')
          return [txid, transaction] as const
        }),
    ),
  )
  return Object.fromEntries(pairs)
}

export async function buildPsbt(params: TransactionBuilderParams) {
  const plan = await planTransaction(params, false)
  const { network, changeScript, inputType, accountKey } = plan
  const inputFields = signingFields(inputType, changeScript, accountKey, network)
  const psbt = new Psbt({ network })
  for (const { utxo, output, previous } of plan.inputs) {
    if (inputType === 'p2pkh') {
      psbt.addInput({ hash: utxo.txid, index: utxo.vout, nonWitnessUtxo: previous.toBuffer() })
    } else {
      psbt.addInput({ hash: utxo.txid, index: utxo.vout, witnessUtxo: output, ...inputFields })
    }
  }
  for (const output of plan.outputs) psbt.addOutput(output)
  return { psbt, fee: plan.fee, requiredFee: plan.requiredFee }
}

export async function estimateBitcoinFees(params: TransactionBuilderParams): Promise<{ fee: bigint; requiredFee: bigint }> {
  const { fee, requiredFee } = await planTransaction(params, true)
  return { fee, requiredFee }
}

async function planTransaction({
  amount, depositAddress, userAddress, publicKey, memo, version, feeRate,
}: TransactionBuilderParams, estimateOnly: boolean) {
  const network = version === 'testnet' ? networks.testnet : networks.bitcoin
  const depositScript = address.toOutputScript(depositAddress, network)
  const changeScript = address.toOutputScript(userAddress, network)
  const inputType = requireBitcoinInputType(changeScript)
  const accountKey = publicKey ? hexToBytes(publicKey) : undefined
  if (BigInt(amount) < dustThreshold(depositScript)) throw new Error('Bitcoin amount is below the dust limit')
  const data = new TextEncoder().encode(memo || '')
  if (data.length > 80) throw new Error('Memo too long; max 80 bytes')

  const rate = feeRate ?? await fetchFeeRate(version)
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid Bitcoin fee rate')
  const utxos = await fetchUtxos(userAddress, version)
  const rawTxMap = await fetchAllRawTxs(utxos, version)
  const sorted = utxos.slice().sort((a, b) => a.value - b.value)
  const outputs = [
    { script: depositScript, value: BigInt(amount) },
    { script: script.compile([opcodes.OP_RETURN, data]), value: 0n },
  ]
  const outputScripts = outputs.map(output => output.script)
  const inputTemplate = signedInputTemplate(inputType, accountKey)
  const feeFor = (inputCount: number, scripts: readonly Uint8Array[]) => estimateHomogeneousFee(inputCount, inputTemplate, scripts, rate)
  const plan = { network, changeScript, inputType, accountKey }

  const inputs: { utxo: Utxo; output: { script: Uint8Array; value: bigint }; previous: Transaction }[] = []
  let total = 0n
  for (const utxo of sorted) {
    const previous = rawTxMap[utxo.txid]
    const output = previous?.outs[utxo.vout]
    if (!output || output.value !== BigInt(utxo.value) || !sameBytes(output.script, changeScript)) {
      throw new Error('Bitcoin UTXO does not match its previous transaction or account')
    }
    total += output.value
    inputs.push({ utxo, output, previous })
    const feeWithoutChange = feeFor(inputs.length, outputScripts)
    if (total < BigInt(amount) + feeWithoutChange) continue

    const feeWithChange = feeFor(inputs.length, [...outputScripts, changeScript])
    const change = total - BigInt(amount) - feeWithChange
    const includeChange = change >= dustThreshold(changeScript)
    const finalOutputs = includeChange ? [...outputs, { script: changeScript, value: change }] : outputs
    const fee = total - finalOutputs.reduce((sum, item) => sum + item.value, 0n)
    const requiredFee = includeChange ? feeWithChange : feeWithoutChange
    return { ...plan, inputs, outputs: finalOutputs, fee, requiredFee }
  }
  if (estimateOnly && inputs.length > 0) {
    const requiredFee = feeFor(inputs.length, [...outputScripts, changeScript])
    return { ...plan, inputs, outputs, fee: requiredFee, requiredFee }
  }
  throw new Error('Insufficient funds for Bitcoin amount and network fee')
}
