import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { Psbt } from 'bitcoinjs-lib'

const address = 'bc1q3k2gr8j7t2fjue4c6mhqyvx9jwzmjrwz433yqd'
const scope = 'bip122:000000000019d6689c085ae165831e93'

async function fixture(invokeMethod) {
    const psbt = new Psbt()
    const script = Buffer.from('0014' + '11'.repeat(20), 'hex')
    psbt.addInput({ hash: '22'.repeat(32), index: 0, witnessUtxo: { script, value: 9671n } })
    psbt.addOutput({ script, value: 8000n })
    const requests = []
    const transports = []
    const deps = {
        '@bigmi/client': { metamask: () => () => ({
            getProvider: async () => ({ request: async () => 'base' }),
            getInternalProvider: async () => ({ accounts: [{ address }] }),
        }) },
        '@bigmi/core': await import('@bigmi/core'),
        'bitcoinjs-lib': { Psbt },
        '@metamask/multichain-api-client': {
            getDefaultTransport: () => {
                const transport = { connected: true, async disconnect() { this.connected = false } }
                transports.push(transport)
                return transport
            },
            getMultichainClient: () => ({
                invokeMethod: async request => {
                    requests.push(request)
                    return invokeMethod ? invokeMethod(request) : { psbt: psbt.toBase64(), txid: null }
                },
            }),
        },
    }
    const { outputText } = ts.transpileModule(readFileSync(new URL('../src/service/metamaskConnector.ts', import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(name => deps[name], module, module.exports)
    const params = { psbt: psbt.toHex(), inputsToSign: [{ address, signingIndexes: [0], sigHash: 1 }] }
    return { psbt, params, requests, transports, connector: module.exports }
}

test('MetaMask signs the supplied transaction with filling and broadcasting disabled', async () => {
    const f = await fixture()
    const provider = await f.connector.metamaskPreservingPsbt({ chainId: 'bitcoin:mainnet' })({}).getProvider()
    assert.equal(await provider.request({ method: 'signPsbt', params: f.params }), f.params.psbt)
    assert.deepEqual(f.requests, [{ scope, request: { method: 'signPsbt', params: {
        account: { address }, psbt: f.psbt.toBase64(), options: { fill: false, broadcast: false },
    } } }])
    assert.equal(f.transports[0].connected, false)
    assert.equal(await provider.request({ method: 'getAccounts' }), 'base')
})

test('MetaMask rejections propagate and still release the transport', async () => {
    const rejection = new Error('User rejected the request.')
    const f = await fixture(() => { throw rejection })
    await assert.rejects(f.connector.signMetaMaskPsbt('bitcoin:mainnet', f.params, [address]), error => error === rejection)
    assert.equal(f.requests.length, 1)
    assert.equal(f.transports[0].connected, false)
    await assert.rejects(f.connector.signMetaMaskPsbt('unknown', f.params, [address]), /Unsupported MetaMask Bitcoin network/)
})

test('MetaMask refuses to sign for an account other than the single connected signer', async () => {
    const f = await fixture()
    const other = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
    for (const [inputsToSign, connected] of [
        [[], [address]],
        [[{ address: other, signingIndexes: [0], sigHash: 1 }], [address]],
        [[{ address, signingIndexes: [0], sigHash: 1 }, { address: other, signingIndexes: [1], sigHash: 1 }], [address, other]],
        [f.params.inputsToSign, []],
    ]) {
        await assert.rejects(
            f.connector.signMetaMaskPsbt('bitcoin:mainnet', { ...f.params, inputsToSign }, connected),
            /does not match the connected MetaMask account/,
        )
    }
    assert.equal(f.requests.length, 0)
    assert.equal(f.transports.length, 0)
})
