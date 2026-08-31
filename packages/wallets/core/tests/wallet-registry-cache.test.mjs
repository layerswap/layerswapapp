import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveWalletConnectWallets } from '../dist/esm/lib/walletConnect/registry.js'
import { getAdditionalConnectorsStore } from '../dist/esm/lib/walletConnect/additionalConnectorsStore.js'
import {
    getRegistryEntryByName,
    requestRegistryEntriesByName,
} from '../dist/esm/lib/walletConnect/registryEntryIndex.js'

const DAY_MS = 24 * 60 * 60 * 1000

const rawWallet = (name, overrides = {}) => ({
    id: name.toLowerCase(),
    name,
    image_id: 'img1',
    order: 1,
    mobile_link: 'https://example.com/m',
    desktop_link: null,
    link_mode: null,
    rdns: null,
    chrome_store: null,
    injected: null,
    chains: ['eip155:1'],
    ...overrides,
})

const payload = (wallets) => ({
    count: wallets.length,
    data: wallets,
    nextPage: null,
    previousPage: null,
})

const jsonResponse = (body) => new Response(JSON.stringify(body), { status: 200 })

function installCaches() {
    const store = new Map()
    const cache = {
        async match(url) {
            const entry = store.get(url)
            return entry ? entry.clone() : undefined
        },
        async put(url, response) {
            store.set(url, response)
        },
    }
    globalThis.caches = { open: async () => cache }
    return store
}

function installFetch(handler) {
    const calls = []
    globalThis.fetch = async (url) => {
        calls.push(String(url))
        return handler(String(url))
    }
    return calls
}

async function rewriteTimestamp(store, url, timestamp) {
    const body = await store.get(url).clone().text()
    store.set(url, new Response(body, {
        headers: { 'content-type': 'application/json', 'x-cached-at': String(timestamp) },
    }))
}

async function waitFor(predicate, timeout = 2000) {
    const start = Date.now()
    while (!predicate()) {
        if (Date.now() - start > timeout) throw new Error('waitFor timed out')
        await new Promise(resolve => setTimeout(resolve, 10))
    }
}

test('browse pages are cached independently by namespace and page', async () => {
    const store = installCaches()
    installFetch(() => jsonResponse(payload([rawWallet('Alpha')])))

    await resolveWalletConnectWallets({ namespace: 'eip155', page: 1, projectId: 'p1', persistCache: true })
    await resolveWalletConnectWallets({ namespace: 'solana', page: 1, projectId: 'p1', persistCache: true })
    await resolveWalletConnectWallets({ namespace: 'eip155', page: 2, projectId: 'p1', persistCache: true })

    assert.equal(store.size, 3)
    const keys = [...store.keys()]
    assert.ok(keys.some(key => key.includes('eip155') && key.includes('page=1')))
    assert.ok(keys.some(key => key.includes('solana') && key.includes('page=1')))
    assert.ok(keys.some(key => key.includes('eip155') && key.includes('page=2')))
})

test('valid cached browse response avoids fetch', async () => {
    installCaches()
    const calls = installFetch(() => jsonResponse(payload([rawWallet('Alpha')])))

    const first = await resolveWalletConnectWallets({ namespace: 'eip155', page: 1, projectId: 'p2', persistCache: true })
    assert.equal(calls.length, 1)

    const second = await resolveWalletConnectWallets({ namespace: 'eip155', page: 1, projectId: 'p2', persistCache: true })
    assert.equal(calls.length, 1)
    assert.deepEqual(second.wallets, first.wallets)
})

test('expired browse entries fetch and replace the cache', async () => {
    const store = installCaches()
    let walletName = 'Alpha'
    const calls = installFetch(() => jsonResponse(payload([rawWallet(walletName)])))

    await resolveWalletConnectWallets({ namespace: 'eip155', page: 1, projectId: 'p3', persistCache: true })
    const url = [...store.keys()][0]
    await rewriteTimestamp(store, url, Date.now() - DAY_MS - 60 * 60 * 1000)

    walletName = 'Beta'
    const result = await resolveWalletConnectWallets({ namespace: 'eip155', page: 1, projectId: 'p3', persistCache: true })

    assert.equal(calls.length, 2)
    assert.equal(result.wallets[0].name, 'Beta')
    const stored = store.get(url)
    const storedData = await stored.clone().json()
    assert.equal(storedData.data[0].name, 'Beta')
    assert.ok(Number(stored.headers.get('x-cached-at')) > Date.now() - DAY_MS)
})

test('modal searches bypass the persistent cache while browse pages persist', async () => {
    const store = installCaches()
    const calls = installFetch(() => jsonResponse(payload([rawWallet('Gamma')])))
    const connectorsStore = getAdditionalConnectorsStore('eip155', 'p4')

    await connectorsStore.requestAdditionalConnectors({ query: 'metamask' })
    assert.equal(calls.length, 1)
    assert.equal(store.size, 0)

    await connectorsStore.requestAdditionalConnectors({ page: 7 })
    assert.equal(calls.length, 2)
    assert.equal(store.size, 1)
    assert.ok([...store.keys()][0].includes('page=7'))
})

test('successful exact package-wallet lookups are cached', async () => {
    const store = installCaches()
    installFetch((url) => url.includes('search=Rainbow')
        ? jsonResponse(payload([rawWallet('Rainbow')]))
        : jsonResponse(payload([rawWallet('Delta')])))
    const connectorsStore = getAdditionalConnectorsStore('eip155', 'p5')
    await connectorsStore.ensureBrowseLoaded()

    requestRegistryEntriesByName(['Rainbow'])
    await waitFor(() => getRegistryEntryByName('Rainbow'))

    assert.ok([...store.keys()].some(key => key.includes('search=Rainbow')))
})

test('empty and non-exact package-wallet lookup responses are cached and reused', async () => {
    const store = installCaches()
    const calls = installFetch((url) => url.includes('search=Empty')
        ? jsonResponse(payload([]))
        : jsonResponse(payload([rawWallet('Phantom Shine')])))

    const empty = await resolveWalletConnectWallets({ namespace: 'eip155', projectId: 'p6', search: 'Empty', entries: 10, persistCache: true })
    await resolveWalletConnectWallets({ namespace: 'eip155', projectId: 'p6', search: 'Empty', entries: 10, persistCache: true })
    assert.equal(empty.wallets.length, 0)
    assert.equal(calls.filter(url => url.includes('search=Empty')).length, 1)

    await resolveWalletConnectWallets({ namespace: 'eip155', projectId: 'p6', search: 'Phantom', entries: 10, persistCache: true })
    await resolveWalletConnectWallets({ namespace: 'eip155', projectId: 'p6', search: 'Phantom', entries: 10, persistCache: true })
    assert.equal(calls.filter(url => url.includes('search=Phantom')).length, 1)

    assert.equal(store.size, 2)
})

test('cache API failure falls back to the network', async () => {
    const calls = installFetch(() => jsonResponse(payload([rawWallet('Epsilon')])))
    globalThis.caches = { open: async () => { throw new Error('unavailable') } }

    const result = await resolveWalletConnectWallets({ namespace: 'eip155', page: 3, projectId: 'p7', persistCache: true })
    assert.equal(result.wallets[0].name, 'Epsilon')
    assert.equal(calls.length, 1)

    delete globalThis.caches
    const second = await resolveWalletConnectWallets({ namespace: 'eip155', page: 4, projectId: 'p7', persistCache: true })
    assert.equal(second.wallets[0].name, 'Epsilon')
    assert.equal(calls.length, 2)
})
