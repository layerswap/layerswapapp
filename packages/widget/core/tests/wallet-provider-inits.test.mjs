import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import React, { StrictMode, act, createElement } from 'react'
import { JSDOM } from 'jsdom'
import { loadSource } from './helpers/source.mjs'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true }
for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const { createRoot } = await import('react-dom/client')
after(() => {
    dom.window.close()
    for (const key of Object.keys(globals)) {
        if (previous[key]) {
            Object.defineProperty(globalThis, key, previous[key])
        } else {
            delete globalThis[key]
        }
    }
})

const { useWalletProviderInits } = loadSource('components/Wallet/WalletProviders/useWalletProviderInits.ts', { react: React })

function Inits({ providers }) {
    useWalletProviderInits(providers, 'Layerswap')
    return null
}

function mount({ strict = false } = {}) {
    const root = createRoot(document.createElement('div'))
    return {
        render: providers => act(() => {
            const element = createElement(Inits, { providers })
            root.render(strict ? createElement(StrictMode, null, element) : element)
        }),
        unmount: () => act(() => root.unmount()),
    }
}

function trackedProvider(id) {
    const counts = { init: 0, cleanup: 0 }
    const provider = {
        id,
        init: () => {
            counts.init += 1
            return () => {
                counts.cleanup += 1
            }
        },
    }
    return { provider, counts }
}

test('provider inits survive other providers hydrating; removed or replaced ones are disposed', async () => {
    const tron = trackedProvider('tron')
    const solana = trackedProvider('solana')
    const solanaReplacement = trackedProvider('solana')
    const view = mount()

    await view.render([tron.provider, { id: 'evm' }])
    await view.render([tron.provider, { id: 'evm' }, solana.provider])
    assert.deepEqual(tron.counts, { init: 1, cleanup: 0 })

    await view.render([solanaReplacement.provider])
    assert.deepEqual(tron.counts, { init: 1, cleanup: 1 })
    assert.deepEqual(solana.counts, { init: 1, cleanup: 1 })

    await view.unmount()
    assert.deepEqual(solanaReplacement.counts, { init: 1, cleanup: 1 })
})

test('StrictMode remounts leave exactly one live init per provider', async () => {
    const tron = trackedProvider('tron')
    const view = mount({ strict: true })

    await view.render([tron.provider])
    assert.equal(tron.counts.init - tron.counts.cleanup, 1)

    await view.unmount()
    assert.equal(tron.counts.init, tron.counts.cleanup)
})
