import assert from 'node:assert/strict'
import test from 'node:test'

import { fetchRegistrySnapshot, matchRegistrySnapshot, normalizeRegistryNames } from '../dist/esm/lib/walletConnect/registrySnapshot.js'
import { getAdditionalConnectorsStore } from '../dist/esm/lib/walletConnect/additionalConnectorsStore.js'
import { defaultWalletConnectChainRegistry } from '../dist/esm/lib/walletConnect/chainRegistry.js'
import { getRegistryEntryByName, requestRegistryEntriesByName } from '../dist/esm/lib/walletConnect/registryEntryIndex.js'

const BATCH_URL = 'https://layerswap.io/app/api/wallet-registry'
const PROJECT_ID = 'batch-test-project'
const SOLANA_CHAIN = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'

defaultWalletConnectChainRegistry.register({ namespace: 'eip155', networkType: 'evm', explorerChainIds: ['eip155:1'] })
defaultWalletConnectChainRegistry.register({ namespace: 'solana', networkType: 'solana', explorerChainIds: [SOLANA_CHAIN] })

const rawWallet = (name, overrides = {}) => ({
    id: name.toLowerCase(), name, image_id: 'img1', order: 1,
    mobile_link: 'https://example.com/m', desktop_link: null, link_mode: null,
    rdns: null, chrome_store: null, injected: null, chains: ['eip155:1'],
    ...overrides,
})
const payload = (wallets, count = wallets.length) => ({ count, data: wallets, nextPage: null, previousPage: null })
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status })

async function lookup(names) {
    requestRegistryEntriesByName(names)
    await new Promise(resolve => setImmediate(resolve))
}

async function mockRegistry(t, ...responses) {
    const requests = []
    t.mock.method(globalThis, 'fetch', async (url, init) => {
        if (url === BATCH_URL) {
            requests.push(JSON.parse(init.body))
            assert.ok(responses.length, 'Unexpected batch request')
            return responses.shift()
        }
        assert.equal(new URL(url).searchParams.get('search'), null)
        // Each case can initialize the same browse cache on its own.
        return jsonResponse(payload([rawWallet('Ledger Live')]))
    })
    await getAdditionalConnectorsStore('eip155', PROJECT_ID).ensureBrowseLoaded()
    return requests
}

test('snapshot fetches every EVM and Solana page without duplicate wallets', async t => {
    const phantom = rawWallet('Phantom', { chains: ['eip155:1', SOLANA_CHAIN] })
    const pages = {
        eip155: [[rawWallet('Alpha'), phantom], [rawWallet('Beta')], [rawWallet('Gamma')]],
        solana: [[phantom, rawWallet('Delta')], [rawWallet('Epsilon')]],
    }
    const fetch = t.mock.method(globalThis, 'fetch', async input => {
        const url = new URL(input)
        const namespace = url.searchParams.get('chains').split(':')[0]
        const page = Number(url.searchParams.get('page'))
        return jsonResponse(payload(pages[namespace][page - 1], namespace === 'eip155' ? 250 : 120))
    })

    const wallets = await fetchRegistrySnapshot(PROJECT_ID)

    assert.equal(fetch.mock.callCount(), 5)
    assert.deepEqual(wallets.map(wallet => wallet.name), ['Alpha', 'Phantom', 'Delta', 'Beta', 'Gamma', 'Epsilon'])
})

test('snapshot matching handles aliases, duplicates, missing wallets and excluded entries', () => {
    const snapshot = ['Trust Wallet', 'Trust', 'Bitget Wallet', 'YoWallet', 'Rainbow'].map(name => rawWallet(name))
    const names = normalizeRegistryNames(['Trust', 'Trust Wallet', 'trust-wallet', 'Bitkeep', 'YoWallet', 'Missing', '!!!'])

    assert.deepEqual(matchRegistrySnapshot(snapshot, names, PROJECT_ID).map(wallet => wallet.name), ['Trust Wallet', 'Bitget Wallet'])
})

test('batch lookup requests only unknown wallets and caches matches and misses', async t => {
    const chains = ['eip155:1', SOLANA_CHAIN]
    const requests = await mockRegistry(t, jsonResponse({ wallets: [rawWallet('Rainbow'), rawWallet('Uniswap Wallet', { chains })] }))
    const names = ['Ledger Live', 'Rainbow', 'Uniswap Wallet', 'Ghost Entry']

    await lookup(names)

    assert.deepEqual(requests, [{ names: ['Rainbow', 'Uniswap Wallet', 'Ghost Entry'], projectId: PROJECT_ID }])
    assert.deepEqual(getRegistryEntryByName('Uniswap Wallet')?.chains, chains)
    assert.equal(getRegistryEntryByName('Ghost Entry'), undefined)

    await lookup(names)
    assert.equal(requests.length, 1)
})

test('failed batches pause requests and recover after the backoff expires', async t => {
    let now = 1000
    t.mock.method(Date, 'now', () => now)
    const requests = await mockRegistry(t, jsonResponse({ error: 'boom' }, 502), jsonResponse({ wallets: [rawWallet('Retry Wallet')] }))

    await lookup(['Retry Wallet'])
    now += 29_999
    await lookup(['Retry Wallet'])
    assert.equal(requests.length, 1)

    now += 1
    await lookup(['Retry Wallet'])
    assert.equal(requests.length, 2)
    assert.equal(getRegistryEntryByName('Retry Wallet')?.name, 'Retry Wallet')
})
