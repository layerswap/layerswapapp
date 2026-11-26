import assert from 'node:assert/strict'
import test from 'node:test'
import { advance, createChunkLoader, loadSource, loadWalletCore, useBrowserTestEnvironment } from '../../../core/tests/helpers/adapterInitHarness.mjs'

const INJECTED = 'starknetkit/injected'
const CONNECTOR_MODULES = {
    [INJECTED]: { InjectedConnector: class { constructor({ options }) { this.id = options.id } } },
    'starknetkit/webwallet': { WebWalletConnector: class { id = 'argentWebWallet' } },
    'starknetkit/controller': { ControllerConnector: class { id = 'controller' } },
}
const EXPECTED_CONNECTORS = ['argentX', 'keplr', 'braavos', 'xverse', 'fordefi', 'okxwallet', 'outis', 'controller', 'argentWebWallet']

function loadStarknetInit(t, plans) {
    useBrowserTestEnvironment(t)
    const { loadChunk, fetches } = createChunkLoader(plans)
    const { retryChunkLoad, connectModalStore } = loadWalletCore()
    const register = t.mock.fn()
    const init = loadSource(new URL('../src/init.ts', import.meta.url), name => {
        if (name === '@starknet-react/core') {
            return { Connector: class {}, ConnectorNotConnectedError: Error, UserNotConnectedError: Error }
        }
        if (name === '@layerswap/wallet-core') {
            return { connectModalStore, retryChunkLoad, getKnownConnectorIconBase64: () => 'icon' }
        }
        if (name === './service/starknetConnectorManager') {
            return { starknetConnectorManager: { register, dispose: () => {} } }
        }
        if (name in CONNECTOR_MODULES) {
            return loadChunk(name).then(() => CONNECTOR_MODULES[name])
        }
        throw new Error(`Unexpected dependency: ${name}`)
    })
    return { ...init, connectModalStore, fetches, register }
}

function assertConnectorsRegisteredOnce(register) {
    assert.equal(register.mock.callCount(), 1)
    assert.deepEqual(register.mock.calls[0].arguments[0].map(connector => connector.id), EXPECTED_CONNECTORS)
}

test('opening the connect modal retries Starknet initialization after its chunk retry is exhausted', async t => {
    const { initStarknetProvider, retryStarknetInitOnModalOpen, connectModalStore, fetches, register } = loadStarknetInit(t, {
        [INJECTED]: [{ after: 100, fail: true }, { after: 100, fail: true }],
    })
    t.after(retryStarknetInitOnModalOpen())
    const logError = t.mock.method(console, 'error', () => {})

    initStarknetProvider()
    await advance(t, 2000)
    assert.equal(fetches.get(INJECTED), 2)
    assert.equal(register.mock.callCount(), 0)
    assert.equal(logError.mock.callCount(), 1)

    connectModalStore._syncOpen(true)
    await advance(t, 2000)

    assert.equal(fetches.get(INJECTED), 3)
    assertConnectorsRegisteredOnce(register)
})

test('reopening the modal during or after Starknet initialization does not register connectors again', async t => {
    const { initStarknetProvider, retryStarknetInitOnModalOpen, connectModalStore, fetches, register } = loadStarknetInit(t, {
        [INJECTED]: [{ after: 500 }],
    })
    t.after(retryStarknetInitOnModalOpen())

    initStarknetProvider()
    await advance(t, 100)
    connectModalStore._syncOpen(true)
    connectModalStore._syncOpen(false)
    connectModalStore._syncOpen(true)
    await advance(t, 1000)
    assertConnectorsRegisteredOnce(register)

    connectModalStore._syncOpen(false)
    connectModalStore._syncOpen(true)
    await advance(t, 1000)

    assert.equal(fetches.get(INJECTED), 1)
    assertConnectorsRegisteredOnce(register)
})
