import axios from 'axios'
import { Psbt, Transaction, networks, opcodes, script } from 'bitcoinjs-lib'
import type { TransactionBuilderParams, Utxo } from './types'
import { estimateFee } from './estimateFee'

const MIN_FEE = 1000n // sats, as BigInt

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

function selectUtxos(utxos: Utxo[], target: bigint): { selected: Utxo[]; total: bigint } {
  const sorted = utxos.slice().sort((a, b) => a.value - b.value)
  let sum = 0n
  const selected: Utxo[] = []
  for (const u of sorted) {
    selected.push(u)
    sum += BigInt(u.value)
    if (sum >= target) break
  }
  if (sum < target) {
    throw new Error(`Insufficient funds: need ${target} sats, have only ${sum}`)
  }
  return { selected, total: sum }
}

export async function buildPsbt({
  amount,         // sats to send
  depositAddress, // where funds go
  userAddress,    // change address
  memo,           // OP_RETURN data
  version,        // 'mainnet' | 'testnet'
  rpcClient,      // for estimateFee
}: TransactionBuilderParams) {
  const network = version === 'testnet' ? networks.testnet : networks.bitcoin

  // fetch & cache
  const utxos = await fetchUtxos(userAddress, version)
  const rawTxMap = await fetchAllRawTxs(utxos, version)

  // validate memo
  const data = Buffer.from(memo || '', 'utf8')
  if (data.length > 80) throw new Error('Memo too long; max 80 bytes')

  let psbt: Psbt
  let fee = MIN_FEE
  let totalSelected: bigint

  // 4️⃣ iterate until selection covers amount + fee
  do {
    const target = BigInt(amount) + fee
    const { selected, total } = selectUtxos(utxos, target)
    totalSelected = total

    // build a fresh PSBT
    psbt = new Psbt({ network })

    // inputs
    for (const u of selected) {
      const tx = rawTxMap[u.txid]
      const out = tx.outs[u.vout]
      psbt.addInput({
        hash: u.txid,
        index: u.vout,
        witnessUtxo: { script: out.script, value: out.value },
      })
    }

    // main output
    psbt.addOutput({ address: depositAddress, value: BigInt(amount) })

    // OP_RETURN
    psbt.addOutput({
      script: script.compile([opcodes.OP_RETURN, data]),
      value: 0n,
    })

    // re‐estimate fee on this draft PSBT
    fee = BigInt((await estimateFee(psbt, rpcClient, version)).toFixed())
  } while (totalSelected < BigInt(amount) + fee)

  // 5️⃣ add change if any
  const change = totalSelected - BigInt(amount) - fee
  if (change > 0n) {
    psbt.addOutput({ address: userAddress, value: change })
  }

  return { psbt, utxos }
}
