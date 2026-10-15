import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { parseEther } from 'viem'

const source = readFileSync(new URL('../src/transferProvider/transactionBuilder.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
const module = { exports: {} }
new Function('require', 'module', 'exports', outputText)(name => {
    assert.equal(name, 'viem')
    return { parseEther }
}, module, module.exports)

test('transaction gas is estimated by the wallet from the real calldata, never from a token-denominated fee', async () => {
    const params = { amount: 0, callData: '0xa9059cbb', depositAddress: '0x1234', network: { chain_id: '1' }, selectedWallet: { address: '0xabcd' } }
    const tx = await module.exports.transactionBuilder(params)
    assert.deepEqual(tx, { chainId: 1, to: params.depositAddress, value: 0n, data: params.callData, account: params.selectedWallet.address })
    assert.equal('gas' in tx, false)
    const native = await module.exports.transactionBuilder({ ...params, amount: '0.001', callData: undefined })
    assert.equal(native.value, 1000000000000000n)
    assert.equal(native.data, '0x')
})
