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

test('hydrating another provider keeps existing provider inits running', async () => {
    const tron = trackedProvider('tron')
    const solana = trackedProvider('solana')
    const withoutInit = { id: 'evm' }
    const view = mount()

    await view.render([tron.provider, withoutInit])
    await view.render([tron.provider, withoutInit, solana.provider])
    assert.deepEqual(tron.counts, { init: 1, cleanup: 0 })
    assert.deepEqual(solana.counts, { init: 1, cleanup: 0 })

    await view.render([solana.provider])
    assert.deepEqual(tron.counts, { init: 1, cleanup: 1 }, 'a removed provider is disposed')
    assert.deepEqual(solana.counts, { init: 1, cleanup: 0 })

    await view.unmount()
    assert.deepEqual(solana.counts, { init: 1, cleanup: 1 })
})

test('a replaced provider instance is disposed and initialized again', async () => {
    const first = trackedProvider('tron')
    const replacement = trackedProvider('tron')
    const view = mount()

    await view.render([first.provider])
    await view.render([replacement.provider])
    await view.unmount()

    assert.deepEqual(first.counts, { init: 1, cleanup: 1 })
    assert.deepEqual(replacement.counts, { init: 1, cleanup: 1 })
})

test('StrictMode remounts leave exactly one live init per provider', async () => {
    const tron = trackedProvider('tron')
    const solana = trackedProvider('solana')
    const view = mount({ strict: true })

    await view.render([tron.provider])
    await view.render([tron.provider, solana.provider])
    assert.equal(tron.counts.init - tron.counts.cleanup, 1)
    assert.equal(solana.counts.init - solana.counts.cleanup, 1)

    await view.unmount()
    assert.equal(tron.counts.init, tron.counts.cleanup)
    assert.equal(solana.counts.init, solana.counts.cleanup)
})

test('an open modal still retries a chunk failure after another provider hydrates', async () => {
    const wallets = '../../../wallets/core/src/'
    const modalStoreModule = loadSource(`${wallets}lib/walletConnect/connectModalStore.ts`)
    const { connectModalStore } = modalStoreModule
    const { retryInitOnModalOpen } = loadSource(`${wallets}lib/chunkLoadRecovery.ts`, {
        './walletConnect/connectModalStore': modalStoreModule,
    })

    const loads = []
    let pending = null
    const initTron = () => {
        if (!pending) {
            pending = new Promise((resolve, reject) => {
                loads.push({ resolve, reject })
            })
            pending.catch(() => {
                pending = null
            })
        }
        return pending
    }
    const tron = {
        id: 'tron',
        init: () => {
            initTron()
            return retryInitOnModalOpen(initTron)
        },
    }
    const solana = trackedProvider('solana')
    const view = mount()

    try {
        await view.render([tron])
        connectModalStore._syncOpen(true)
        await view.render([tron, solana.provider])
        assert.equal(loads.length, 1)

        loads[0].reject(Object.assign(new Error('Loading chunk 2757 failed.'), { name: 'ChunkLoadError' }))
        await new Promise(resolve => setImmediate(resolve))

        assert.equal(loads.length, 2, 'Tron gets one automatic retry in the open modal')
    } finally {
        connectModalStore._syncOpen(false)
        await view.unmount()
    }
})
