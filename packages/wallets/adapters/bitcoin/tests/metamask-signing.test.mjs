import assert from 'node:assert/strict'
import test from 'node:test'
import { Psbt } from 'bitcoinjs-lib'
import { signMetaMaskPsbt } from '../dist/esm/service/metamaskConnector.js'

const address = 'bc1q3k2gr8j7t2fjue4c6mhqyvx9jwzmjrwz433yqd'
const scope = 'bip122:000000000019d6689c085ae165831e93'
const testnetScope = 'bip122:000000000933ea01ad0ee984209779ba'

function fixture() {
    const psbt = new Psbt()
    const script = Buffer.from('0014' + '11'.repeat(20), 'hex')
    psbt.addInput({ hash: '22'.repeat(32), index: 0, witnessUtxo: { script, value: 9671n } })
    psbt.addOutput({ script, value: 8000n })
    psbt.addOutput({ script, value: 1327n })
    const requests = []
    const session = {
        sessionScopes: {
            [scope]: { methods: ['signPsbt'], accounts: [`${scope}:${address}`] },
        },
    }
    const client = {
        getSession: async () => session,
        invokeMethod: async (request) => {
            requests.push(request)
            return { psbt: psbt.toBase64(), txid: null }
        },
    }
    const params = { psbt: psbt.toHex(), inputsToSign: [{ address, signingIndexes: [0], sigHash: 1 }] }
    return { psbt, client, requests, session, params }
}

test('MetaMask signs the supplied transaction with filling and broadcasting disabled', async () => {
    const f = fixture()
    const result = await signMetaMaskPsbt(f.client, 'bitcoin:mainnet', [address], f.params)
    assert.equal(result, f.params.psbt)
    assert.deepEqual(f.requests, [{ scope, request: { method: 'signPsbt', params: {
        account: { address }, psbt: f.psbt.toBase64(), options: { fill: false, broadcast: false },
    } } }])
    const returned = Psbt.fromHex(result)
    assert.equal(returned.data.inputs[0].witnessUtxo.value - returned.txOutputs.reduce((n, o) => n + o.value, 0n), 344n)
})

test('account, network and missing signing grants fail before requesting a signature', async () => {
    for (const failure of ['account', 'network', 'method', 'disconnected']) {
        const f = fixture()
        let connected = [address]
        if (failure === 'account') f.session.sessionScopes[scope].accounts = [`${scope}:another-address`]
        if (failure === 'network') f.session.sessionScopes = { [testnetScope]: f.session.sessionScopes[scope] }
        if (failure === 'method') f.session.sessionScopes[scope].methods = []
        if (failure === 'disconnected') connected = []
        await assert.rejects(signMetaMaskPsbt(f.client, 'bitcoin:mainnet', connected, f.params))
        assert.equal(f.requests.length, 0)
    }
})

test('changed inputs, outputs, sequence or locktime are rejected after signing', async () => {
    for (const mutate of [
        p => p.addOutput({ script: p.txOutputs[0].script, value: 1n }),
        p => p.addInput({ hash: '33'.repeat(32), index: 1 }),
        p => p.setInputSequence(0, 1),
        p => p.setLocktime(1),
    ]) {
        const f = fixture()
        const changed = f.psbt.clone()
        mutate(changed)
        f.client.invokeMethod = async () => ({ psbt: changed.toBase64(), txid: null })
        await assert.rejects(signMetaMaskPsbt(f.client, 'bitcoin:mainnet', [address], f.params), /changed the prepared/)
    }
})

test('signature metadata is permitted and wallet rejection is propagated without retry', async () => {
    const f = fixture()
    const finalized = f.psbt.clone()
    finalized.updateInput(0, { finalScriptWitness: Buffer.from([0]) })
    f.client.invokeMethod = async () => ({ psbt: finalized.toBase64(), txid: null })
    assert.equal(await signMetaMaskPsbt(f.client, 'bitcoin:mainnet', [address], f.params), finalized.toHex())
    const rejection = new Error('User rejected the request.')
    let calls = 0
    f.client.invokeMethod = async () => { calls++; throw rejection }
    await assert.rejects(signMetaMaskPsbt(f.client, 'bitcoin:mainnet', [address], f.params), error => error === rejection)
    assert.equal(calls, 1)
})
