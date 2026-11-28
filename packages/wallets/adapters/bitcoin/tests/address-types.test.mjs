import assert from 'node:assert/strict'
import test from 'node:test'
import axios from 'axios'
import ecc from '@bitcoinerlab/secp256k1'
import { crypto, networks, payments, Transaction, Psbt } from 'bitcoinjs-lib'
import { buildPsbt, estimateBitcoinFees } from '../dist/esm/transferProvider/transactionBuilder/buildPsbt.js'
import { estimateHomogeneousFee } from '../dist/esm/transferProvider/transactionBuilder/estimateFee.js'
import { signedInputTemplate } from '../dist/esm/transferProvider/transactionBuilder/inputScripts.js'
import { transactionBuilder } from '../dist/esm/transferProvider/transactionBuilder/index.js'

const network = networks.bitcoin
const privateKey = Buffer.alloc(32, 7)
const publicKey = Buffer.from(ecc.pointFromScalar(privateKey, true))
const xOnly = publicKey.subarray(1)
const depositAddress = payments.p2tr({ internalPubkey: Buffer.from(ecc.pointFromScalar(Buffer.alloc(32, 3), true)).subarray(1), network }).address

const accounts = {
  p2wpkh: payments.p2wpkh({ pubkey: publicKey, network }),
  p2tr: payments.p2tr({ internalPubkey: xOnly, network }),
  'p2sh-p2wpkh': payments.p2sh({ redeem: payments.p2wpkh({ pubkey: publicKey, network }), network }),
  p2pkh: payments.p2pkh({ pubkey: publicKey, network }),
}

async function withUtxos(script, values, run) {
  const previous = new Transaction()
  previous.addInput(Buffer.alloc(32, 9), 0xffffffff)
  for (const value of values) previous.addOutput(script, BigInt(value))
  const original = axios.get
  axios.get = async url => {
    if (url.endsWith('/utxo')) return { data: values.map((value, vout) => ({ txid: previous.getId(), vout, value })) }
    if (url.endsWith('/hex')) return { data: previous.toHex() }
    throw new Error('Unexpected request: ' + url)
  }
  try { await run() } finally { axios.get = original }
}

function signer(type, signingKey = publicKey) {
  if (type !== 'p2tr') return { publicKey: signingKey, sign: hash => Buffer.from(ecc.sign(hash, privateKey)) }
  const odd = publicKey[0] === 3
  const key = odd ? ecc.privateNegate(privateKey) : privateKey
  const tweaked = Buffer.from(ecc.privateAdd(key, crypto.taggedHash('TapTweak', xOnly)))
  return {
    publicKey: Buffer.from(ecc.pointFromScalar(tweaked, true)),
    signSchnorr: hash => Buffer.from(ecc.signSchnorr(hash, tweaked)),
  }
}

for (const [type, account] of Object.entries(accounts)) {
  test(`${type} accounts build a signable deposit whose fee covers the signed size`, async () => {
    await withUtxos(account.output, [6000, 7000], async () => {
      const params = {
        userAddress: account.address, publicKey: publicKey.toString('hex'), depositAddress,
        amount: 9000, memo: '15d994f;', version: 'mainnet', feeRate: 3,
      }
      const { psbt, inputsToSign, fee } = await transactionBuilder(params)
      assert.equal(psbt.inputCount, 2)
      assert.deepEqual(inputsToSign, [{ address: account.address, sigHash: type === 'p2tr' ? 0 : 1, signingIndexes: [0, 1] }])

      const input = psbt.data.inputs[0]
      assert.equal(!!input.nonWitnessUtxo, type === 'p2pkh')
      assert.equal(!!input.witnessUtxo, type !== 'p2pkh')
      assert.equal(!!input.redeemScript, type === 'p2sh-p2wpkh')
      assert.equal(!!input.tapInternalKey, type === 'p2tr')

      const signed = Psbt.fromHex(psbt.toHex())
      signed.signAllInputs(signer(type))
      signed.finalizeAllInputs()
      const transaction = signed.extractTransaction()
      assert.equal(signed.getFee(), fee)
      assert.ok(BigInt(Math.ceil(transaction.virtualSize() * 3)) <= fee)
      assert.ok(fee - BigInt(transaction.virtualSize() * 3) <= 3n * 3n * 2n)
    })
  })
}

test('fee probes without a public key size every account type exactly', async () => {
  for (const [type, account] of Object.entries(accounts)) {
    await withUtxos(account.output, [20000], async () => {
      const params = { userAddress: account.address, depositAddress, amount: 9000, memo: '15d994f;', version: 'mainnet', feeRate: 1 }
      const { fee } = await estimateBitcoinFees(params)
      const exact = await buildPsbt({ ...params, publicKey: publicKey.toString('hex') })
      assert.equal(fee, exact.fee, type)
    })
  }
})

test('Legacy accounts with an uncompressed key are sized for the full key', async () => {
  const uncompressed = Buffer.from(ecc.pointFromScalar(privateKey, false))
  const account = payments.p2pkh({ pubkey: uncompressed, network })
  await withUtxos(account.output, [6000, 7000], async () => {
    const { psbt, fee } = await buildPsbt({
      userAddress: account.address, publicKey: uncompressed.toString('hex'), depositAddress,
      amount: 9000, memo: '15d994f;', version: 'mainnet', feeRate: 3,
    })
    psbt.signAllInputs(signer('p2pkh', uncompressed))
    psbt.finalizeAllInputs()
    const transaction = psbt.extractTransaction()
    assert.ok(BigInt(Math.ceil(transaction.virtualSize() * 3)) <= fee)
    assert.ok(fee - BigInt(transaction.virtualSize() * 3) <= 3n * 3n * 2n)
  })
})

test('count-based fee sizing matches bitcoinjs virtual size at encoding boundaries', () => {
  const outputs = [accounts.p2tr.output, Buffer.from('6a0431323334', 'hex')]
  for (const [type, account] of Object.entries(accounts)) {
    {
      const template = signedInputTemplate(type)
      for (const count of [1, 2, 252, 253]) {
        for (const withChange of [false, true]) {
          const sized = new Transaction()
          for (let index = 0; index < count; index++) {
            sized.addInput(Buffer.alloc(32, 1), index, 0xffffffff, template.scriptSig)
            if (template.witness) sized.setWitness(index, template.witness)
          }
          const scripts = withChange ? [...outputs, account.output] : outputs
          for (const script of scripts) sized.addOutput(script, 1000n)
          for (const rate of [1, 1.1, 3]) {
            assert.equal(estimateHomogeneousFee(count, template, scripts, rate), BigInt(Math.ceil(sized.virtualSize() * rate)), `${type} x${count} @${rate}`)
          }
        }
      }
    }
  }
})

test('coin selection stays fast for wallets with many small UTXOs', async () => {
  for (const type of ['p2wpkh', 'p2pkh']) {
    const account = accounts[type]
    await withUtxos(account.output, Array.from({ length: 1000 }, () => 600), async () => {
      const started = performance.now()
      const { fee } = await estimateBitcoinFees({ userAddress: account.address, depositAddress, amount: 900000, memo: '', version: 'mainnet', feeRate: 1 })
      assert.ok(fee > 0n)
      assert.ok(performance.now() - started < 2000, `${type}: ${Math.round(performance.now() - started)} ms`)
    })
  }
})

test('Nested SegWit signing requires the matching account public key', async () => {
  const account = accounts['p2sh-p2wpkh']
  await withUtxos(account.output, [20000], async () => {
    const params = { userAddress: account.address, depositAddress, amount: 9000, memo: '15d994f;', version: 'mainnet', feeRate: 1 }
    await assert.rejects(buildPsbt(params), /public key required/)
    const otherKey = Buffer.from(ecc.pointFromScalar(Buffer.alloc(32, 8), true)).toString('hex')
    await assert.rejects(buildPsbt({ ...params, publicKey: otherKey }), /does not match/)
  })
})

test('Taproot keys that do not match the address leave the internal key to the wallet', async () => {
  const account = accounts.p2tr
  await withUtxos(account.output, [20000], async () => {
    const otherKey = Buffer.from(ecc.pointFromScalar(Buffer.alloc(32, 8), true)).toString('hex')
    const { psbt } = await buildPsbt({ userAddress: account.address, publicKey: otherKey, depositAddress, amount: 9000, memo: '', version: 'mainnet', feeRate: 1 })
    assert.equal(psbt.data.inputs[0].tapInternalKey, undefined)
  })
})

test('script-hash multisig and other unsupported accounts are rejected clearly', async () => {
  const p2wsh = payments.p2wsh({ redeem: payments.p2pk({ pubkey: publicKey, network }), network })
  await withUtxos(p2wsh.output, [20000], async () => {
    await assert.rejects(
      buildPsbt({ userAddress: p2wsh.address, depositAddress, amount: 9000, memo: '', version: 'mainnet', feeRate: 1 }),
      /Unsupported Bitcoin address type/,
    )
  })
})
