import assert from 'node:assert/strict'
import test from 'node:test'
import { advance, createChunkLoader, loadSource, loadWalletCore, useBrowserTestEnvironment } from '../../../core/tests/helpers/adapterInitHarness.mjs'

const SHARED_CHUNK = 'tron-adapter-shared'
const ADAPTERS = {
    '@tronweb3/tronwallet-adapter-metamask-tron': 'MetaMaskAdapter',
    '@tronweb3/tronwallet-adapter-tronlink': 'TronLinkAdapter',
    '@tronweb3/tronwallet-adapter-okxwallet': 'OkxWalletAdapter',
    '@tronweb3/tronwallet-adapter-bitkeep': 'BitKeepAdapter',
    '@tronweb3/tronwallet-adapter-bybit': 'BybitWalletAdapter',
    '@tronweb3/tronwallet-adapter-gatewallet': 'GateWalletAdapter',
    '@tronweb3/tronwallet-adapter-trust': 'TrustAdapter',
}
const METAMASK = '@tronweb3/tronwallet-adapter-metamask-tron'
const TRONLINK = '@tronweb3/tronwallet-adapter-tronlink'

// Each adapter import loads its own chunk plus a chunk shared by every adapter.
function loadTronInit(t, plans) {
    useBrowserTestEnvironment(t)
    const { loadChunk, fetches } = createChunkLoader(plans)
    const { retryChunkLoad, connectModalStore } = loadWalletCore()
    const register = t.mock.fn()
    const init = loadSource(new URL('../src/init.ts', import.meta.url), name => {
        if (name === '@layerswap/wallet-core') {
            return { connectModalStore, retryChunkLoad }
        }
        if (name === './service/tronAdapterManager') {
            return { tronAdapterManager: { register, dispose: () => {} } }
        }
        if (name in ADAPTERS) {
            const exportName = ADAPTERS[name]
            return Promise.all([loadChunk(name), loadChunk(SHARED_CHUNK)])
                .then(() => ({ [exportName]: class { name = exportName } }))
        }
        throw new Error(`Unexpected dependency: ${name}`)
    })
    return { ...init, connectModalStore, fetches, register }
}

function assertAllAdaptersRegistered(register) {
    assert.equal(register.mock.callCount(), 1)
    assert.deepEqual(register.mock.calls[0].arguments[0].map(adapter => adapter.name), Object.values(ADAPTERS))
}

test('staggered chunk failures each get a fresh attempt before adapters register', async t => {
    const { initTronProvider, fetches, register } = loadTronInit(t, {
        [METAMASK]: [{ after: 100, fail: true }, { after: 100 }],
        [TRONLINK]: [{ after: 800, fail: true }, { after: 100 }],
    })

    initTronProvider()
    await advance(t, 2000)

    assert.equal(fetches.get(METAMASK), 2)
    assert.equal(fetches.get(TRONLINK), 2)
    assertAllAdaptersRegistered(register)
})

test('a failed shared chunk is fetched once more for every adapter waiting on it', async t => {
    const { initTronProvider, fetches, register } = loadTronInit(t, {
        [SHARED_CHUNK]: [{ after: 100, fail: true }, { after: 100 }],
    })

    initTronProvider()
    await advance(t, 2000)

    assert.equal(fetches.get(SHARED_CHUNK), 2)
    for (const name of Object.keys(ADAPTERS)) {
        assert.equal(fetches.get(name), 1, `${name} chunk is not refetched`)
    }
    assertAllAdaptersRegistered(register)
})

test('opening the connect modal retries initialization after its chunk retry is exhausted', async t => {
    const { initTronProvider, retryTronInitOnModalOpen, connectModalStore, fetches, register } = loadTronInit(t, {
        [METAMASK]: [{ after: 100, fail: true }, { after: 100, fail: true }],
    })
    t.after(retryTronInitOnModalOpen())
    const logError = t.mock.method(console, 'error', () => {})

    initTronProvider()
    await advance(t, 2000)
    assert.equal(fetches.get(METAMASK), 2)
    assert.equal(register.mock.callCount(), 0)
    assert.equal(logError.mock.callCount(), 1)

    connectModalStore._syncOpen(true)
    await advance(t, 2000)

    assert.equal(fetches.get(METAMASK), 3)
    assertAllAdaptersRegistered(register)
})

test('reopening the modal during or after initialization does not register adapters again', async t => {
    const { initTronProvider, retryTronInitOnModalOpen, connectModalStore, fetches, register } = loadTronInit(t, {
        [METAMASK]: [{ after: 500 }],
    })
    t.after(retryTronInitOnModalOpen())

    initTronProvider()
    await advance(t, 100)
    connectModalStore._syncOpen(true)
    connectModalStore._syncOpen(false)
    connectModalStore._syncOpen(true)
    await advance(t, 1000)
    assertAllAdaptersRegistered(register)

    connectModalStore._syncOpen(false)
    connectModalStore._syncOpen(true)
    await advance(t, 1000)

    assert.equal(fetches.get(METAMASK), 1)
    assertAllAdaptersRegistered(register)
})
