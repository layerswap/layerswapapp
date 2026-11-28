import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import axios from 'axios'
import { address, networks, Transaction, Psbt } from 'bitcoinjs-lib'
import { bitcoinAmountInSatoshis } from '../dist/esm/bitcoinAmount.js'
import { buildPsbt, estimateBitcoinFees } from '../dist/esm/transferProvider/transactionBuilder/buildPsbt.js'
import { dustThreshold } from '../dist/esm/transferProvider/transactionBuilder/outputPolicy.js'
import { estimateHomogeneousFee } from '../dist/esm/transferProvider/transactionBuilder/estimateFee.js'
import { requireBitcoinInputType, signedInputTemplate } from '../dist/esm/transferProvider/transactionBuilder/inputScripts.js'

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
  const scripts = [taproot, Buffer.from('6a053130663263', 'hex'), ...(change ? [witness] : [])]
  return Number(estimateHomogeneousFee(1, signedInputTemplate('p2wpkh'), scripts, 1))
}

test('Bitcoin amounts use exact API satoshis or the decimal BTC amount', () => {
  assert.equal(bitcoinAmountInSatoshis(0.00008005), 8005)
  assert.equal(bitcoinAmountInSatoshis(0.000080059), 8005)
  assert.equal(bitcoinAmountInSatoshis(1.2e-7), 12)
  assert.equal(bitcoinAmountInSatoshis(0.00008004, '8005'), 8005)
  assert.equal(bitcoinAmountInSatoshis(0.00008005, '0'), 8005)
  assert.throws(() => bitcoinAmountInSatoshis(0, '0'), /positive integer/)
  for (const invalid of ['-1', '8005.1', '8005.0', '8e3', '0x1f40', ' 8005', '9007199254740992']) {
    assert.throws(() => bitcoinAmountInSatoshis(0.00008005, invalid), /positive integer/)
  }
})

test('dust thresholds follow script types and exempt OP_RETURN', () => {
  for (const [hex, threshold] of [
    ['0014' + '11'.repeat(20), 294n], ['5120' + '11'.repeat(32), 330n],
    ['0020' + '11'.repeat(32), 330n], ['a914' + '11'.repeat(20) + '87', 540n],
    ['76a914' + '11'.repeat(20) + '88ac', 546n], ['6a', 0n],
  ]) {
    const script = Buffer.from(hex, 'hex')
    assert.equal(dustThreshold(script), threshold)
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
        for (const output of result.psbt.txOutputs) assert.ok(output.value >= dustThreshold(output.script))
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
    assert.ok((await estimateBitcoinFees(params)).fee > 0n)
  })
})

test('fee service failures and invalid amounts cannot produce a signable draft', async () => {
  const original = axios.get
  axios.get = async () => { throw new Error('Fee service unavailable') }
  try {
    await assert.rejects(buildPsbt({ ...params, feeRate: undefined }), /Fee service unavailable/)
  } finally { axios.get = original }
  await assert.rejects(buildPsbt({ ...params, amount: 1 }), /dust limit/)
  for (const feeRate of [0, -1, Number.NaN]) {
    await assert.rejects(buildPsbt({ ...params, feeRate }), /Invalid Bitcoin fee rate/)
  }
})

test('UTXOs that disagree with their previous transaction or account cannot be spent', async () => {
  const previous = new Transaction()
  previous.addInput(Buffer.alloc(32), 0xffffffff)
  previous.addOutput(witness, 20000n)
  previous.addOutput(taproot, 20000n)
  const other = new Transaction()
  other.addInput(Buffer.alloc(32, 1), 0xffffffff)
  other.addOutput(witness, 20000n)
  const cases = [
    [{ txid: previous.getId(), vout: 0, value: 30000 }, previous, /does not match its previous transaction or account/],
    [{ txid: previous.getId(), vout: 1, value: 20000 }, previous, /does not match its previous transaction or account/],
    [{ txid: previous.getId(), vout: 2, value: 20000 }, previous, /does not match its previous transaction or account/],
    [{ txid: previous.getId(), vout: 0, value: 20000 }, other, /does not match its id/],
  ]
  const original = axios.get
  try {
    for (const [utxo, served, error] of cases) {
      axios.get = async url => {
        if (url.endsWith('/utxo')) return { data: [utxo] }
        if (url.endsWith('/hex')) return { data: served.toHex() }
        throw new Error('Unexpected request: ' + url)
      }
      await assert.rejects(buildPsbt(params), error)
    }
  } finally { axios.get = original }
})

test('fee estimate covers finalized SegWit and Taproot sizes including the real memo', () => {
  for (const inputScript of [witness, taproot]) {
    for (const memoLength of [0, 80]) {
      const memo = Buffer.concat([Buffer.from(memoLength > 75 ? [0x6a, 0x4c, memoLength] : [0x6a, memoLength]), Buffer.alloc(memoLength)])
      const outputs = [[taproot, 5000n], [memo, 0n], [witness, 1000n]]
      const signed = new Transaction()
      signed.addInput(Buffer.alloc(32), 0)
      for (const [script, value] of outputs) signed.addOutput(script, value)
      signed.setWitness(0, inputScript === witness ? [Buffer.alloc(73), Buffer.alloc(33)] : [Buffer.alloc(65)])
      const template = signedInputTemplate(requireBitcoinInputType(inputScript))
      const scripts = outputs.map(([script]) => script)
      assert.equal(estimateHomogeneousFee(1, template, scripts, 1), BigInt(signed.virtualSize()))
      assert.equal(estimateHomogeneousFee(1, template, scripts, 1.1), BigInt(Math.ceil(signed.virtualSize() * 1.1)))
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
  const deps = {
    './bitcoinAmount.js': { bitcoinAmountInSatoshis },
    './transferProvider/bitcoinMemo.js': await import('../dist/esm/transferProvider/bitcoinMemo.js'),
    './service/connectedPublicKey.js': { connectedPublicKey: () => undefined },
    './transferProvider/transactionBuilder/buildPsbt.js': await import('../dist/esm/transferProvider/transactionBuilder/buildPsbt.js'),
    '@layerswap/utils': {
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
      const exact = await provider.getGas({ ...args, amount: 9362 / 1e8, callData: '22911311;', amountInBaseUnits: '9363' })
      assert.equal(Math.round(provisional.gas * 1e8), 338)
      assert.equal(Math.round(exact.gas * 1e8), 637)
      assert.equal(Math.round(exact.requiredFee * 1e8), 282)
      const transaction = await buildPsbt({ ...params, amount: 9363, memo: bitcoinMemo('22911311;'), feeRate: 2 })
      assert.equal(Math.round(exact.gas * 1e8), Number(transaction.fee))
    } finally { axios.get = original }
  })
})

test('the reviewed fee belongs to the exact PSBT passed to the signer', async () => {
  const { sendTransaction } = await import('../dist/esm/transferProvider/sendTransaction.js')
  const reviewRequired = new Error('fee review required')
  const cancelled = new Error('wallet rejected')
  let reviewedFee
  let feeReads = 0
  let signingRequests = 0
  let walletPrompts = 0
  const connector = {
    getProvider: async () => ({
      request: async ({ params }) => {
        signingRequests++
        assert.equal(walletPrompts, signingRequests)
        const psbt = Psbt.fromHex(params.psbt)
        assert.equal(psbt.txOutputs[0].value, 8005n)
        const inputTotal = psbt.data.inputs.reduce((sum, input) => sum + input.witnessUtxo.value, 0n)
        const outputTotal = psbt.txOutputs.reduce((sum, output) => sum + output.value, 0n)
        assert.equal(inputTotal - outputTotal, reviewedFee)
        throw cancelled
      },
    }),
  }
  await withUtxo(10000, async () => {
    const original = axios.get
    axios.get = async url => {
      if (!url.endsWith('/fees/recommended')) return original(url)
      return { data: { economyFee: ++feeReads, minimumFee: 1 } }
    }
    try {
      const transfer = {
        amount: 0.00008005, userAddress, depositAddress, callData: '22911311;', connector,
        onWalletPrompt: () => { walletPrompts++ },
      }
      await assert.rejects(sendTransaction({
        ...transfer,
        reviewFee: async () => { throw reviewRequired },
      }), error => error === reviewRequired)
      assert.equal(signingRequests, 0)
      assert.equal(walletPrompts, 0)
      await assert.rejects(sendTransaction({
        ...transfer,
        reviewFee: async fee => { reviewedFee = fee },
      }), error => error === cancelled)
      assert.equal(signingRequests, 1)
      assert.equal(feeReads, 2)
    } finally {
      axios.get = original
    }
  })
})

test('a wallet that changes the prepared transaction is rejected before broadcast', async () => {
  const { sendTransaction } = await import('../dist/esm/transferProvider/sendTransaction.js')
  for (const mutate of [
    p => p.addOutput({ script: p.txOutputs[0].script, value: 1n }),
    p => p.addInput({ hash: '33'.repeat(32), index: 1 }),
    p => p.setInputSequence(0, 1),
    p => p.setLocktime(1),
  ]) {
    const connector = {
      getProvider: async () => ({
        request: async ({ params }) => {
          const changed = Psbt.fromHex(params.psbt)
          mutate(changed)
          return changed.toHex()
        },
      }),
    }
    const rpcClient = { call: async () => assert.fail('changed transaction was broadcast') }
    await withUtxo(10000, async () => {
      const original = axios.get
      axios.get = async url => url.endsWith('/fees/recommended')
        ? { data: { economyFee: 1, minimumFee: 1 } } : original(url)
      try {
        await assert.rejects(sendTransaction({
          amount: 0.00008005, userAddress, depositAddress, callData: '22911311;', connector, rpcClient,
        }), /changed the prepared/)
      } finally {
        axios.get = original
      }
    })
  }
})

test('Bitcoin fee review uses the transfer token when the action network omits its token', async () => {
  const widgetTypes = await import('@layerswap/widget-types')
  const { sendTransaction } = await import('../dist/esm/transferProvider/sendTransaction.js')
  const source = readFileSync(new URL('../src/transferProvider/createBitcoinTransfer.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const reviewRequired = new widgetTypes.TransferFeeReviewRequired()
  let walletPrompts = 0
  const connector = { getProvider: async () => ({ request: async () => assert.fail('unexpected signing request') }) }
  const deps = {
    '@layerswap/widget-types': widgetTypes,
    '@bigmi/client': { getAccount: () => ({ connector }) },
    '@layerswap/utils': {
      JsonRpcClient: class {},
      KnownInternalNames: (await import('@layerswap/utils/known-ids')).default,
    },
    './sendTransaction': { sendTransaction },
    './toTransferError': { toTransferError: error => error },
    '../service/getBitcoinConfig': { getBitcoinConfig: () => ({}) },
    '../service/connectedPublicKey': { connectedPublicKey: () => undefined },
  }
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)(name => {
    assert.ok(name in deps, name)
    return deps[name]
  }, module, module.exports)
  const token = { symbol: 'BTC', decimals: 8 }
  const provider = module.exports.createBitcoinTransfer()
  await withUtxo(10000, async () => {
    const original = axios.get
    axios.get = async url => url.endsWith('/fees/recommended')
      ? { data: { economyFee: 1, minimumFee: 1 } } : original(url)
    try {
      await assert.rejects(provider.executeTransfer({
        network: { name: 'BITCOIN_MAINNET', type: widgetTypes.NetworkType.Bitcoin },
        selectedWallet: { address: userAddress },
        token, amount: 0.00009534, amountInBaseUnits: '9535', depositAddress, callData: '22911311;',
        onWalletPrompt: () => { walletPrompts++ },
        reviewFee: async fee => {
          assert.equal(fee.token, token)
          assert.equal(Math.round(fee.gas * 1e8), 465)
          throw reviewRequired
        },
      }), error => error === reviewRequired)
      assert.equal(walletPrompts, 0)
    } finally {
      axios.get = original
    }
  })
})
