import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import React, { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(path, imports = {}) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8')
    const { outputText } = ts.transpileModule(source, { compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(id => id in imports ? imports[id] : require(id), module, module.exports)
    return module.exports
}

test('mobile recovery only opens the selected wallet’s current request and clears between actions', async () => {
    const { walletRequestStore, recordWalletRequest } = load('../../../wallets/core/src/lib/walletConnect/walletRequestStore.ts')
    const { walletKey } = load('../../../wallets/core/src/lib/walletKey.ts')
    const { WalletRequestRecovery } = load('../src/components/Pages/Swap/Withdraw/Presentation/WalletRequestRecovery.tsx', {
        react: React, '@layerswap/wallet-core': { walletKey, walletRequestStore },
    })
    const previous = Object.getOwnPropertyDescriptors(globalThis)
    const dom = new JSDOM('<div id="root"></div>')
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
    const root = createRoot(document.getElementById('root'))
    const wallet = { id: 'Rainbow', address: '0xAbC' }
    const request = { walletName: 'Rainbow', namespace: 'eip155', accounts: ['0xabc'], href: 'rainbow://wc?requestId=1&sessionTopic=test' }
    const render = async (props = {}) => act(async () => root.render(createElement(WalletRequestRecovery, {
        wallet, active: true, afterSequence: 0, ...props,
    })))
    const publish = async (overrides = {}) => act(async () => recordWalletRequest({ ...request, ...overrides }))
    try {
        await render()
        assert.equal(document.querySelector('a'), null, 'preparation cannot open a stale request')
        await publish()
        assert.equal(document.querySelector('a').getAttribute('href'), request.href)
        assert.equal(document.querySelector('a').textContent, 'Open wallet')
        await render({ active: false })
        assert.equal(document.querySelector('a'), null, 'no recovery link while waiting on the backend')
        await render({ afterSequence: walletRequestStore.getSnapshot().sequence })
        assert.equal(document.querySelector('a'), null, 'the previous approval must not reopen during signing')
        await publish({ href: 'rainbow://wc?requestId=2&sessionTopic=test' })
        assert.match(document.querySelector('a').getAttribute('href'), /requestId=2/)
        await publish({ walletName: 'MetaMask' })
        assert.equal(document.querySelector('a'), null)
        await publish({ accounts: ['0xother'] })
        assert.equal(document.querySelector('a'), null)
        await publish({ href: undefined })
        assert.equal(document.querySelector('a'), null)
        assert.match(document.body.textContent, /Open Rainbow manually/)
        await render({ wallet: { id: 'Rainbow', address: 'AbC' } })
        await publish({ namespace: 'solana', accounts: ['abc'] })
        assert.equal(document.querySelector('a'), null, 'non-EVM accounts are case sensitive')
    } finally {
        await act(async () => root.unmount())
        dom.window.close()
        for (const key of ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']) {
            if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
            else delete globalThis[key]
        }
    }
})
