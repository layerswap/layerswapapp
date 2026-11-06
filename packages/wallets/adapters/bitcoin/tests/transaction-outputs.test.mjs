import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import axios from 'axios'
import { address, networks, Transaction, Psbt } from 'bitcoinjs-lib'
import { buildPsbt, estimateBitcoinFee } from '../dist/esm/transferProvider/transactionBuilder/buildPsbt.js'
import { dustThreshold, validateOutputs } from '../dist/esm/transferProvider/transactionBuilder/outputPolicy.js'
import { estimateFee } from '../dist/esm/transferProvider/transactionBuilder/estimateFee.js'

const witness = Buffer.from('0014' + '11'.repeat(20), 'hex')
const taproot = Buffer.from('5120' + '22'.repeat(32), 'hex')
const userAddress = address.fromOutputScript(witness, networks.bitcoin)
const depositAddress = address.fromOutputScript(taproot, networks.bitcoin)
const params = { userAddress, depositAddress, amount: 5464, memo: '10f2c', version: 'mainnet', feeRate: 1 }

async function withUtxo(total, run) {
  const previous = new Transaction()
  previous.addInput(Buffer.alloc(32), 0xffffffff)
  previous.addOutput(witness, BigInt(total))
  const original = axios.get
  axios.get = async url => {
    if (url.endsWith('/utxo')) return { data: [{ txid: previous.getId(), vout: 0, value: total }] }
    if (url.endsWith('/hex')) return { data: previous.toHex() }
    throw new Error('Unexpected request: ' + url)
  }
  try { await run() } finally { axios.get = original }
}

function requiredFee(amount, change) {
  const psbt = new Psbt()
  psbt.addInput({ hash: Buffer.alloc(32), index: 0, witnessUtxo: { script: witness, value: 10000n } })
  psbt.addOutput({ script: taproot, value: BigInt(amount) })
  psbt.addOutput({ script: Buffer.from('6a053130663263', 'hex'), value: 0n })
  if (change) psbt.addOutput({ script: witness, value: 0n })
  return Number(estimateFee(psbt, 1))
}

test('dust thresholds follow script types and exempt OP_RETURN', () => {
  for (const [hex, threshold] of [
    ['0014' + '11'.repeat(20), 294n], ['5120' + '11'.repeat(32), 330n],
    ['0020' + '11'.repeat(32), 330n], ['a914' + '11'.repeat(20) + '87', 540n],
    ['76a914' + '11'.repeat(20) + '88ac', 546n], ['6a', 0n],
  ]) {
    const script = Buffer.from(hex, 'hex')
    assert.equal(dustThreshold(script), threshold)
    validateOutputs([{ script, value: threshold }])
    if (threshold > 0n) assert.throws(() => validateOutputs([{ script, value: threshold - 1n }]), /Dust output 0/)
  }
})

test('reported amounts preserve deposit and never produce dust change', async () => {
  for (const amount of [5464, 5400]) {
    for (const remainder of [0, 1, 293, 294, 295]) {
      const fee = requiredFee(amount, true)
      const total = amount + fee + remainder
      await withUtxo(total, async () => {
        const result = await buildPsbt({ ...params, amount })
        assert.equal(result.psbt.txOutputs[0].value, BigInt(amount))
        assert.equal(result.psbt.txOutputs[1].value, 0n)
        assert.equal(result.psbt.txOutputs.length, remainder >= 294 ? 3 : 2)
        assert.equal(result.fee, BigInt(total) - result.psbt.txOutputs.reduce((sum, o) => sum + o.value, 0n))
        validateOutputs(result.psbt.txOutputs)
      })
    }
  }
})

test('exact no-change funding succeeds; underfunded signing fails but Max can estimate', async () => {
  await withUtxo(params.amount + requiredFee(params.amount, false), async () => {
    assert.equal((await buildPsbt(params)).psbt.txOutputs.length, 2)
  })
  await withUtxo(params.amount, async () => {
    await assert.rejects(buildPsbt(params), /Insufficient funds/)
    assert.ok(await estimateBitcoinFee(params) > 0n)
  })
})

test('fee service failures and invalid amounts cannot produce a signable draft', async () => {
  const original = axios.get
  axios.get = async () => { throw new Error('Fee service unavailable') }
  try {
    await assert.rejects(buildPsbt({ ...params, feeRate: undefined }), /Fee service unavailable/)
  } finally { axios.get = original }
  await assert.rejects(buildPsbt({ ...params, amount: 1 }), /Dust output/)
  await assert.rejects(buildPsbt({ ...params, amount: 1.2 }), /positive integer/)
})

test('fee estimate covers finalized SegWit and Taproot sizes including the real memo', () => {
  for (const inputScript of [witness, taproot]) {
    for (const memoLength of [0, 80]) {
      const psbt = new Psbt()
      psbt.addInput({ hash: Buffer.alloc(32), index: 0, witnessUtxo: { script: inputScript, value: 10000n } })
      psbt.addOutput({ script: taproot, value: 5000n })
      const memo = Buffer.concat([Buffer.from(memoLength > 75 ? [0x6a, 0x4c, memoLength] : [0x6a, memoLength]), Buffer.alloc(memoLength)])
      psbt.addOutput({ script: memo, value: 0n })
      psbt.addOutput({ script: witness, value: 1000n })
      const signed = new Transaction()
      signed.addInput(Buffer.alloc(32), 0)
      for (const output of psbt.txOutputs) signed.addOutput(output.script, output.value)
      signed.setWitness(0, inputScript === witness ? [Buffer.alloc(73), Buffer.alloc(33)] : [Buffer.alloc(65)])
      assert.equal(estimateFee(psbt, 1), BigInt(signed.virtualSize()))
      assert.equal(estimateFee(psbt, 1.1), BigInt(Math.ceil(signed.virtualSize() * 1.1)))
    }
  }
})

test('required fee excludes absorbed change and matches the final output shape', async () => {
  await withUtxo(10000, async () => {
    for (const [amount, change, fee, required] of [
      [9361, 295n, 344n, 344n], [9362, 294n, 344n, 344n],
      [9363, undefined, 637n, 282n], [9712, undefined, 288n, 282n],
    ]) {
      const result = await buildPsbt({ ...params, amount, memo: '15d994f;', feeRate: 2 })
      assert.equal(result.psbt.txOutputs[0].value, BigInt(amount))
      assert.equal(result.psbt.txOutputs[2]?.value, change)
      assert.equal(result.fee, fee)
      assert.equal(result.requiredFee, required)
    }
  })
})

test('the gas provider prices the sender memo, including dust absorbed into the total fee', async () => {
  // The package barrel has extensionless bundler imports. Load the provider
  // source with its real leaf dependencies so this remains a Node-only test.
  const deps = {
    './transferProvider/bitcoinMemo.js': await import('../dist/esm/transferProvider/bitcoinMemo.js'),
    './transferProvider/transactionBuilder/buildPsbt.js': await import('../dist/esm/transferProvider/transactionBuilder/buildPsbt.js'),
    '@layerswap/utils': {
      JsonRpcClient: class { call() { assert.fail('Fee estimation must not use the transaction RPC') } },
      ...(await import(new URL('formatUnits.js', import.meta.resolve('@layerswap/utils')))),
      KnownInternalNames: (await import('@layerswap/utils/known-ids')).default,
    },
    '@layerswap/widget-types': await import('@layerswap/widget-types'),
  }
  const source = readFileSync(new URL('../src/bitcoinGasProvider.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)(name => {
    assert.ok(name in deps, name)
    return deps[name]
  }, module, module.exports)
  const { BitcoinGasProvider } = module.exports
  const { bitcoinMemo } = await import('../dist/esm/transferProvider/bitcoinMemo.js')
  assert.equal(bitcoinMemo('22911311;'), '15d994f;')
  assert.equal(bitcoinMemo('22911311;preserved;tail'), '15d994f;preserved;tail')
  const token = { symbol: 'BTC', decimals: 8 }
  await withUtxo(10000, async () => {
    const original = axios.get
    axios.get = async url => url.endsWith('/fees/recommended')
      ? { data: { economyFee: 2, minimumFee: 1 } } : original(url)
    try {
      const provider = new BitcoinGasProvider()
      const args = { address: userAddress, recipientAddress: depositAddress, token,
        network: { name: 'BITCOIN_MAINNET', token, node_url: 'https://example.invalid' }, amount: 9363 / 1e8 }
      const provisional = await provider.getGas(args)
      const exact = await provider.getGas({ ...args, callData: '22911311;', amountInBaseUnits: '0' })
      assert.equal(Math.round(provisional.gas * 1e8), 338)
      assert.equal(Math.round(exact.gas * 1e8), 637)
      assert.equal(Math.round(exact.requiredFee * 1e8), 282)
      const transaction = await buildPsbt({ ...params, amount: 9363, memo: bitcoinMemo('22911311;'), feeRate: 2 })
      assert.equal(Math.round(exact.gas * 1e8), Number(transaction.fee))
    } finally { axios.get = original }
  })
})
