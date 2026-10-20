import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createRequire } from 'node:module'
const { outputText } = ts.transpileModule(readFileSync(new URL('../src/helpers/resolveSelectedWallet.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } })
const module = { exports: {} }
new Function('module', 'exports', outputText)(module, module.exports)
const { resolveSelectedWallet } = module.exports
const first = { id: 'Braavos', providerName: 'Starknet', address: '0x111', addresses: ['0x111'] }
const second = { ...first, address: '0x222', addresses: ['0x222'] }

test('same-name Starknet wallets resolve by the selected address', () => {
    assert.equal(resolveSelectedWallet([first, second], { id: 'Braavos', address: '0x222' }), second)
    assert.equal(resolveSelectedWallet([first], { id: 'Braavos', address: '0x333' }), undefined)
})
test('a multi-account connector submits with the selected account without mutating its snapshot', () => {
    const wallet = { ...first, addresses: ['0x111', '0xABC'] }
    assert.equal(resolveSelectedWallet([wallet], { id: 'Braavos', address: '0xabc' }).address, '0xabc')
    assert.equal(wallet.address, '0x111')
})
test('provider identity and ambiguous wallets cannot select an unintended signer', () => {
    const selected = { id: 'Braavos', address: '0x111', providerName: 'Starknet' }
    assert.equal(resolveSelectedWallet([first, { ...first, providerName: 'Other' }], selected), first)
    assert.equal(resolveSelectedWallet([first, { ...first }], selected), undefined)
    assert.equal(resolveSelectedWallet([first], undefined), undefined)
})

test('hex account padding is normalized without ignoring case on other chains', () => {
    assert.equal(resolveSelectedWallet([first], { id: first.id, address: '0x000111' }).address, '0x000111')
    const solana = { id: 'Phantom', providerName: 'Solana', address: 'AbC', addresses: ['AbC'] }
    assert.equal(resolveSelectedWallet([solana], { id: solana.id, address: 'abc' }), undefined)
    assert.equal(resolveSelectedWallet([solana], { id: solana.id, address: 'AbC' }), solana)
})

test('TON snapshot formats preserve the selected wallet across restoration', () => {
    const tonRequire = createRequire(new URL('../../../wallets/adapters/ton/package.json', import.meta.url))
    const { Address } = tonRequire('@ton/core')
    const source = readFileSync(new URL('../../../wallets/adapters/ton/src/service/TonConnectionService.ts', import.meta.url), 'utf8')
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
    const imports = {
        '@layerswap/wallet-core': { resolveWalletIconString: () => undefined },
        '@tonconnect/sdk': {}, '@ton/core': { Address },
        '../constants': { name: 'Ton', id: 'ton' }, './getTonConnect': {},
        './tonStore': { useTonStore: { getState: () => ({ wallets: [] }) } },
        './isTonWalletInstalled': {}, './getTonConnectDeepLink': {},
    }
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(name => {
        assert.ok(name in imports, `Unexpected TON service dependency: ${name}`)
        return imports[name]
    }, module, module.exports)
    const service = new module.exports.TonConnectionService()
    const address = Address.parse(`0:${'12'.repeat(32)}`)
    const restored = service.resolveWallet({ address: address.toRawString(), appName: 'tonkeeper' })
    // Source account selection retains the adapter's canonical wallet address.
    const selected = { id: restored.id, providerName: restored.providerName, address: restored.address }
    assert.equal(selected.address, address.toString({ bounceable: false }))
    for (const format of [address.toRawString(), address.toString({ bounceable: true }), address.toString({ bounceable: false })]) {
        const wallet = service.resolveWallet({ address: format, appName: 'tonkeeper' })
        assert.deepEqual(wallet.addresses, [selected.address])
        assert.equal(resolveSelectedWallet([wallet], selected), wallet)
    }
    const other = service.resolveWallet({ address: `0:${'34'.repeat(32)}`, appName: 'tonkeeper' })
    assert.equal(resolveSelectedWallet([other], selected), undefined)
})
