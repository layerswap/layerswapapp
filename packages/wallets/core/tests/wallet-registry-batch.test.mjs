import assert from 'node:assert/strict'
import test from 'node:test'

import { fetchRegistrySnapshot, matchRegistrySnapshot, normalizeRegistryNames } from '../dist/esm/lib/walletConnect/registrySnapshot.js'
import { getAdditionalConnectorsStore } from '../dist/esm/lib/walletConnect/additionalConnectorsStore.js'
import {
    getRegistryEntryByName,
    requestRegistryEntriesByName,
} from '../dist/esm/lib/walletConnect/registryEntryIndex.js'

const BATCH_URL = 'https://layerswap.io/app/api/wallet-registry'

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

const payload = (wallets, count = wallets.length) => ({
    count,
    data: wallets,
    nextPage: null,
    previousPage: null,
})

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status })

function installFetch(handler) {
    const calls = []
    globalThis.fetch = async (url, init) => {
        const call = { url: String(url), body: init?.body ? JSON.parse(init.body) : undefined }
        calls.push(call)
        return handler(call)
    }
    return calls
}

const batchCalls = (calls) => calls.filter(call => call.url === BATCH_URL)

async function waitFor(predicate, timeout = 2000) {
    const start = Date.now()
    while (!predicate()) {
        if (Date.now() - start > timeout) throw new Error('waitFor timed out')
        await new Promise(resolve => setTimeout(resolve, 10))
    }
}

const settle = () => new Promise(resolve => setTimeout(resolve, 50))

test('snapshot fetches all EVM and Solana pages and dedupes by wallet id', async () => {
    const shared = rawWallet('Phantom', { chains: ['eip155:1', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'] })
    const calls = installFetch(({ url }) => {
        const page = new URL(url).searchParams.get('page')
        if (url.includes('eip155')) {
            if (page === '1') return jsonResponse(payload([rawWallet('Alpha'), shared], 250))
            if (page === '2') return jsonResponse(payload([rawWallet('Beta')], 250))
            return jsonResponse(payload([rawWallet('Gamma')], 250))
        }
        if (page === '1') return jsonResponse(payload([shared, rawWallet('Delta')], 120))
        return jsonResponse(payload([rawWallet('Epsilon')], 120))
    })

    const wallets = await fetchRegistrySnapshot('p1')

    assert.equal(calls.length, 5)
    assert.equal(calls.filter(call => call.url.includes('eip155')).length, 3)
    assert.equal(calls.filter(call => call.url.includes('solana')).length, 2)
    assert.ok(calls.every(call => new URL(call.url).searchParams.get('entries') === '100'))
    assert.deepEqual(wallets.map(wallet => wallet.name), ['Alpha', 'Phantom', 'Delta', 'Beta', 'Gamma', 'Epsilon'])
})

test('normalizeRegistryNames dedupes identities and drops empty keys', () => {
    assert.deepEqual(normalizeRegistryNames(['Trust', 'Trust Wallet', 'trust-wallet', '!!!', 'Rainbow']), ['trust', 'rainbow'])
})

test('matchRegistrySnapshot matches identities, applies slug overrides, skips filtered slugs and duplicate identities', () => {
    const snapshot = [
        rawWallet('Trust Wallet'),
        rawWallet('Trust'),
        rawWallet('Bitget Wallet'),
        rawWallet('YoWallet'),
        rawWallet('Rainbow'),
    ]

    const matches = matchRegistrySnapshot(snapshot, normalizeRegistryNames(['trust', 'Bitkeep', 'YoWallet', 'Uniswap']), 'p1')

    assert.deepEqual(matches.map(wallet => wallet.name), ['Trust Wallet', 'Bitget Wallet'])
})

test('one batch resolves all requested names without per-wallet Reown lookups', async () => {
    const calls = installFetch(({ url }) => {
        if (url === BATCH_URL) return jsonResponse({ wallets: [rawWallet('Rainbow'), rawWallet('Uniswap Wallet', { chains: ['eip155:1', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'] })] })
        return jsonResponse(payload([]))
    })
    await getAdditionalConnectorsStore('batch-ns-1', 'pb1').ensureBrowseLoaded()

    requestRegistryEntriesByName(['Rainbow', 'Uniswap Wallet'])
    await waitFor(() => getRegistryEntryByName('Rainbow'))

    assert.equal(batchCalls(calls).length, 1)
    assert.deepEqual(batchCalls(calls)[0].body, { names: ['Rainbow', 'Uniswap Wallet'] })
    assert.ok(calls.every(call => !call.url.includes('search=')))
    assert.deepEqual(getRegistryEntryByName('Uniswap Wallet')?.chains, ['eip155:1', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'])

    requestRegistryEntriesByName(['Rainbow', 'Zerion Fresh'])
    await waitFor(() => batchCalls(calls).length === 2)
    assert.deepEqual(batchCalls(calls)[1].body, { names: ['Zerion Fresh'] })
})

test('names present in loaded browse pages are not submitted', async () => {
    const calls = installFetch(({ url }) => {
        if (url === BATCH_URL) return jsonResponse({ wallets: [] })
        return jsonResponse(payload([rawWallet('Ledger Live X')]))
    })
    await getAdditionalConnectorsStore('batch-ns-2', 'pb2').ensureBrowseLoaded()

    requestRegistryEntriesByName(['Ledger Live X', 'Fresh Unknown'])
    await waitFor(() => batchCalls(calls).length === 1)

    assert.deepEqual(batchCalls(calls)[0].body, { names: ['Fresh Unknown'] })
})

test('empty matches are recorded and not re-requested', async () => {
    const calls = installFetch(({ url }) => {
        if (url === BATCH_URL) return jsonResponse({ wallets: [] })
        return jsonResponse(payload([]))
    })
    await getAdditionalConnectorsStore('batch-ns-3', 'pb3').ensureBrowseLoaded()

    requestRegistryEntriesByName(['Ghost Entry'])
    await waitFor(() => batchCalls(calls).length === 1)
    await settle()

    assert.equal(getRegistryEntryByName('Ghost Entry'), undefined)
    requestRegistryEntriesByName(['Ghost Entry'])
    await settle()
    assert.equal(batchCalls(calls).length, 1)
})

test('failed batches back off instead of retrying immediately', async () => {
    const calls = installFetch(({ url }) => {
        if (url === BATCH_URL) return jsonResponse({ error: 'boom' }, 502)
        return jsonResponse(payload([]))
    })
    await getAdditionalConnectorsStore('batch-ns-4', 'pb4').ensureBrowseLoaded()

    requestRegistryEntriesByName(['Doomed Entry'])
    await waitFor(() => batchCalls(calls).length === 1)
    await settle()

    assert.equal(getRegistryEntryByName('Doomed Entry'), undefined)
    requestRegistryEntriesByName(['Doomed Entry'])
    await settle()
    assert.equal(batchCalls(calls).length, 1)
})
