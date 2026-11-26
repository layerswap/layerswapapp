import assert from 'node:assert/strict'
import test from 'node:test'
import { advance, createChunkLoader, loadSource, loadWalletCore, useBrowserTestEnvironment } from '../../../core/tests/helpers/adapterInitHarness.mjs'

const ADAPTERS_CHUNK = '@solana/wallet-adapter-wallets'
const adapter = name => class { name = name }
const ADAPTERS_MODULE = {
    NightlyWalletAdapter: adapter('Nightly'),
    PhantomWalletAdapter: adapter('Phantom'),
    SolflareWalletAdapter: adapter('Solflare'),
    BitgetWalletAdapter: adapter('Bitget'),
    TrustWalletAdapter: adapter('Trust'),
    LedgerWalletAdapter: adapter('Ledger'),
    WalletConnectWalletAdapter: adapter('WalletConnect (official)'),
}
const EXPECTED_ADAPTERS = ['Phantom', 'Nightly', 'Solflare', 'Bitget', 'Trust', 'Ledger', 'WalletConnect', 'WalletConnect (official)']

function loadSvmInit(t, plans) {
    useBrowserTestEnvironment(t)
    const { loadChunk, fetches } = createChunkLoader(plans)
    const { retryChunkLoad, retryInitOnModalOpen, connectModalStore } = loadWalletCore()
    const register = t.mock.fn()
    let walletConnectConfig = null
    const init = loadSource(new URL('../src/init.ts', import.meta.url), name => {
        if (name === '@layerswap/utils') {
            return { isMobile: () => false, AppSettings: { ApiVersion: 'mainnet' } }
        }
        if (name === '@layerswap/wallet-core/chunkLoadRecovery') {
            return { retryChunkLoad }
        }
        if (name === '@solana/wallet-adapter-base') {
            return { WalletAdapterNetwork: { Devnet: 'devnet', Mainnet: 'mainnet-beta' }, WalletReadyState: {} }
        }
        if (name === './service/svmAdapterManager') {
            return { svmAdapterManager: { register, dispose: () => {} } }
        }
        if (name === './connectors/SolanaWalletConnectAdapter') {
            return { SolanaWalletConnectAdapter: adapter('WalletConnect') }
        }
        if (name === './service/walletConnectConfig') {
            return {
                getWalletConnectConfig: () => walletConnectConfig,
                setWalletConnectConfig: config => {
                    walletConnectConfig = config ?? null
                },
            }
        }
        if (name === ADAPTERS_CHUNK) {
            return loadChunk(name).then(() => ADAPTERS_MODULE)
        }
        throw new Error(`Unexpected dependency: ${name}`)
    })
    return { ...init, retryInitOnModalOpen, connectModalStore, fetches, register }
}

function assertAdaptersRegisteredOnce(register) {
    assert.equal(register.mock.callCount(), 1)
    assert.deepEqual(register.mock.calls[0].arguments[0].map(registered => registered.name), EXPECTED_ADAPTERS)
}

test('opening the connect modal retries Solana initialization after its chunk retry is exhausted', async t => {
    const { initSvmProvider, retryInitOnModalOpen, connectModalStore, fetches, register } = loadSvmInit(t, {
        [ADAPTERS_CHUNK]: [{ after: 100, fail: true }, { after: 100, fail: true }],
    })
    t.after(retryInitOnModalOpen(initSvmProvider))
    const logError = t.mock.method(console, 'error', () => {})

    initSvmProvider()
    await advance(t, 2000)
    assert.equal(fetches.get(ADAPTERS_CHUNK), 2)
    assert.equal(register.mock.callCount(), 0)
    assert.equal(logError.mock.callCount(), 1)

    connectModalStore._syncOpen(true)
    await advance(t, 2000)

    assert.equal(fetches.get(ADAPTERS_CHUNK), 3)
    assertAdaptersRegisteredOnce(register)
})

test('reopening the modal during or after Solana initialization does not register adapters again', async t => {
    const { initSvmProvider, retryInitOnModalOpen, connectModalStore, fetches, register } = loadSvmInit(t, {
        [ADAPTERS_CHUNK]: [{ after: 500 }],
    })
    t.after(retryInitOnModalOpen(initSvmProvider))

    initSvmProvider()
    await advance(t, 100)
    connectModalStore._syncOpen(true)
    connectModalStore._syncOpen(false)
    connectModalStore._syncOpen(true)
    await advance(t, 1000)
    assertAdaptersRegisteredOnce(register)

    connectModalStore._syncOpen(false)
    connectModalStore._syncOpen(true)
    await advance(t, 1000)

    assert.equal(fetches.get(ADAPTERS_CHUNK), 1)
    assertAdaptersRegisteredOnce(register)
})

test('a Solana load that fails after the modal opened is retried once while the modal stays open', async t => {
    const { initSvmProvider, retryInitOnModalOpen, connectModalStore, fetches, register } = loadSvmInit(t, {
        [ADAPTERS_CHUNK]: [{ after: 300, fail: true }, { after: 300, fail: true }],
    })
    t.after(retryInitOnModalOpen(initSvmProvider))
    t.mock.method(console, 'error', () => {})

    initSvmProvider()
    await advance(t, 100)
    connectModalStore._syncOpen(true)
    await advance(t, 3000)

    assert.equal(fetches.get(ADAPTERS_CHUNK), 3)
    assertAdaptersRegisteredOnce(register)
})
