import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)

test('preparing a transaction never waits for fee estimation or uses token fees as gas units', async () => {
    let gasCalls = 0
    const module = { exports: {} }
    const source = readFileSync(new URL('../src/transferProvider/transactionBuilder.ts', import.meta.url), 'utf8')
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
    new Function('require', 'module', 'exports', outputText)(id => id === '../gasProviders' ? {
        EVMGasProvider: class { async getGas() { gasCalls++; return { gas: 1 } } },
    } : require(id), module, module.exports)
    const tx = await module.exports.transactionBuilder({
        amount: '0.01', callData: '0x1234', depositAddress: '0x0000000000000000000000000000000000000002',
        selectedWallet: { address: '0x0000000000000000000000000000000000000001' }, network: { chain_id: '10' }, token: {},
    })
    assert.equal(gasCalls, 0)
    assert.equal(tx.gas, undefined)
    assert.equal(tx.value, 10000000000000000n)
    assert.equal(tx.chainId, 10)
    assert.equal(tx.data, '0x1234')
    assert.equal(tx.account, '0x0000000000000000000000000000000000000001')
    assert.equal(tx.to, '0x0000000000000000000000000000000000000002')
})
