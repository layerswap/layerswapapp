import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

import { createWalletProvidersRegistry } from '../dist/esm/lib/walletConnect/walletProvidersRegistry.js'

// @layerswap/utils' ESM build doesn't load in plain Node, so transpile the
// helper from source with a stand-in Address (EVM compares case-insensitively).
const Address = {
    equals: (a, b, _network, providerName) => !!a && !!b
        && (providerName === 'EVM' ? a.toLowerCase() === b.toLowerCase() : a === b),
}
function loadLoginWallet() {
    const { outputText } = ts.transpileModule(readFileSync(new URL('../src/lib/loginWallet.ts', import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(name => {
        if (name === '@layerswap/utils') return { Address }
        throw new Error(`Unexpected loginWallet dependency: ${name}`)
    }, module, module.exports)
    return module.exports
}
const { isLoginWalletMatch, markLoginWallet } = loadLoginWallet()

const LOGIN = { address: '0xAbC0000000000000000000000000000000000001', providerId: 'evm' }
const OTHER = '0x0000000000000000000000000000000000000002'
const wallet = (address, extra = {}) => ({ id: address, address, addresses: [address], providerName: 'EVM', isActive: true, ...extra })
const snapshot = (wallets, extra = {}) => ({ id: 'evm', name: 'EVM', connectedWallets: wallets, activeWallet: wallets[0], withdrawalSupportedNetworks: [], ready: true, ...extra })

test('isLoginWalletMatch requires the provider id to match', () => {
    assert.equal(isLoginWalletMatch(wallet(LOGIN.address), 'evm', LOGIN), true)
    assert.equal(isLoginWalletMatch(wallet(LOGIN.address), 'starknet', LOGIN), false)
    assert.equal(isLoginWalletMatch(wallet(LOGIN.address), 'evm', undefined), false)
})

test('isLoginWalletMatch tolerates checksum/case differences', () => {
    assert.equal(isLoginWalletMatch(wallet(LOGIN.address.toLowerCase()), 'evm', LOGIN), true)
})

test('isLoginWalletMatch matches an address inside addresses[]', () => {
    assert.equal(isLoginWalletMatch(wallet(OTHER, { addresses: [OTHER, LOGIN.address.toLowerCase()] }), 'evm', LOGIN), true)
    assert.equal(isLoginWalletMatch(wallet(OTHER), 'evm', LOGIN), false)
})

test('markLoginWallet keeps identity when nothing matches', () => {
    const s = snapshot([wallet(OTHER)])
    assert.equal(markLoginWallet(s, LOGIN), s)
    assert.equal(markLoginWallet(s, undefined), s)
    assert.equal(markLoginWallet({ ...s, id: 'starknet' }, { ...LOGIN, address: OTHER }).activeWallet.isLoginWallet, undefined)
})

test('markLoginWallet flags only the matching wallets and caches the copy', () => {
    const other = wallet(OTHER)
    const login = wallet(LOGIN.address)
    const s = snapshot([other, login], { activeWallet: login })

    const marked = markLoginWallet(s, LOGIN)
    assert.notEqual(marked, s)
    assert.equal(marked.connectedWallets[0], other)
    assert.equal(marked.connectedWallets[1].isLoginWallet, true)
    assert.equal(marked.activeWallet.isLoginWallet, true)
    assert.equal(login.isLoginWallet, undefined)

    assert.equal(markLoginWallet(s, { ...LOGIN }), marked)
    const remarked = markLoginWallet(s, { ...LOGIN, address: OTHER })
    assert.equal(remarked.connectedWallets[0].isLoginWallet, true)
    assert.equal(remarked.activeWallet.isLoginWallet, undefined)
})

test('registry notifies only when the login wallet changes', () => {
    const registry = createWalletProvidersRegistry()
    let notified = 0
    registry.subscribe(() => notified++)

    registry.setLoginWallet(LOGIN)
    registry.setLoginWallet({ ...LOGIN })
    assert.equal(notified, 1)
    assert.deepEqual(registry.getLoginWallet(), LOGIN)

    registry.setLoginWallet(undefined)
    assert.equal(notified, 2)
    assert.equal(registry.getLoginWallet(), undefined)
})
