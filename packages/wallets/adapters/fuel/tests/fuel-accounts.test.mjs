import assert from 'node:assert/strict'
import test, { after, beforeEach } from 'node:test'
import { EventEmitter } from 'node:events'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { Account, Provider, ScriptTransactionRequest, FuelConnectorEventTypes } from '@fuel-ts/account'
import { Address } from '@fuel-ts/address'
import { isUserRejection, normalizeWalletErrorCode } from '@layerswap/wallet-core/errors'

const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
            try { return nextResolve(`${specifier}.js`, context) }
            catch (error) {
                if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
                return nextResolve(`${specifier}/index.js`, context)
            }
        }
        return nextResolve(specifier, context)
    },
})
after(() => hooks.deregister())

const { useFuelStore } = await import('../dist/esm/service/fuelStore.js')
const { FuelConnectionService } = await import('../dist/esm/service/FuelConnectionService.js')
const { attachFuelSync, registerFuelWalletSynchronizer } = await import('../dist/esm/service/syncFuel.js')
const { setFuelInstance } = await import('../dist/esm/service/getFuel.js')
const { createFuelTransfer } = await import('../dist/esm/transferProvider/createFuelTransfer.js')
const { resolveFuelChainId } = await import('../dist/esm/service/resolveFuelChainId.js')

const addressA = `0x${'11'.repeat(32)}`
const addressB = `0x${'ab'.repeat(32)}`
const addressC = `0x${'33'.repeat(32)}`
const settle = () => new Promise(resolve => setImmediate(resolve))

function connector(name = 'Fuel Wallet', accounts = [addressA]) {
    return Object.assign(new EventEmitter(), {
        name, connected: true, installed: true, authorizedAccounts: accounts,
        metadata: { install: { link: 'https://example.com' } },
        async accounts() { return [...this.authorizedAccounts] },
        async isConnected() { return this.connected },
        async currentNetwork() { return { chainId: 9889, url: 'https://mainnet.fuel.network' } },
        async disconnect() { this.connected = false },
        async sendTransaction() { return { id: 'fuel-transaction' } },
    })
}

function wallet(id, address, addresses = [address]) {
    return { id, address, addresses, providerName: 'Fuel', isActive: true }
}

beforeEach(() => {
    useFuelStore.setState({ connectedWallets: [], connectors: [], fuel: undefined, ready: false })
    setFuelInstance(null)
})
after(() => setFuelInstance(null))

test('reauthorization replaces a connector entry while retaining its authorized account list and other wallets', () => {
    const store = useFuelStore.getState()
    store.connectWallet(wallet('Fuel Wallet', addressA))
    store.connectWallet(wallet('Fuelet', addressC))
    store.connectWallet(wallet('Fuel Wallet', addressB, [addressB, addressA]))
    assert.deepEqual(useFuelStore.getState().connectedWallets.map(w => [w.id, w.address, w.addresses]), [
        ['Fuel Wallet', addressB, [addressB, addressA]],
        ['Fuelet', addressC, [addressC]],
    ])
})

test('account sync removes revoked and disconnected entries rather than accumulating stale senders', async () => {
    const fuelWallet = connector()
    const fuelet = connector('Fuelet', [addressC])
    useFuelStore.getState()._setConnectors([fuelWallet, fuelet])
    const service = new FuelConnectionService()
    await service.syncConnectedWallets()
    fuelWallet.authorizedAccounts = [addressB]
    await service.syncConnectedWallets()
    assert.deepEqual(useFuelStore.getState().connectedWallets.map(w => w.address), [addressB, addressC])
    assert.equal(service.buildProvider().activeWallet.address, addressB)

    fuelWallet.authorizedAccounts = []
    await service.syncConnectedWallets()
    assert.deepEqual(useFuelStore.getState().connectedWallets.map(w => w.id), ['Fuelet'])
    fuelet.connected = false
    await service.syncConnectedWallets()
    assert.deepEqual(useFuelStore.getState().connectedWallets, [])
})

test('a transient accounts failure retains the connected wallet while refreshing other connectors', async t => {
    const fuelWallet = connector()
    const fuelet = connector('Fuelet', [addressC])
    useFuelStore.getState()._setConnectors([fuelWallet, fuelet])
    const service = new FuelConnectionService()
    await service.syncConnectedWallets()
    const cachedWallet = useFuelStore.getState().connectedWallets[0]
    const originalAccounts = fuelWallet.accounts
    const failure = t.mock.method(fuelWallet, 'accounts', async () => { throw new Error('temporary query failure') })
    t.mock.method(console, 'error', () => {})
    fuelet.authorizedAccounts = [addressB]

    await service.syncConnectedWallets()
    const refreshedWallet = useFuelStore.getState().connectedWallets[0]
    assert.equal(refreshedWallet, cachedWallet)
    assert.equal(service.buildProvider().activeWallet, refreshedWallet)
    assert.deepEqual(useFuelStore.getState().connectedWallets.map(w => [w.id, w.address]), [
        ['Fuel Wallet', addressA], ['Fuelet', addressB],
    ])
    assert.equal(failure.mock.callCount(), 1)

    fuelWallet.accounts = originalAccounts
    fuelWallet.authorizedAccounts = [addressB]
    await service.syncConnectedWallets()
    assert.equal(useFuelStore.getState().connectedWallets[0].address, addressB)
    fuelWallet.authorizedAccounts = []
    await service.syncConnectedWallets()
    assert.deepEqual(useFuelStore.getState().connectedWallets.map(w => w.id), ['Fuelet'])
})

test('a network query failure applies newly authorized accounts while preserving cached network metadata', async t => {
    const fuelWallet = connector()
    const fuelet = connector('Fuelet', [addressC])
    useFuelStore.getState()._setConnectors([fuelWallet, fuelet])
    const service = new FuelConnectionService()
    await service.syncConnectedWallets()
    const cachedWallet = useFuelStore.getState().connectedWallets[0]
    fuelWallet.authorizedAccounts = [new Address(addressB).toChecksum(), addressC]
    const networkQuery = t.mock.method(fuelWallet, 'currentNetwork', async () => { throw new Error('temporary network failure') })
    t.mock.method(console, 'error', () => {})

    await service.syncConnectedWallets()
    const refreshedWallet = useFuelStore.getState().connectedWallets[0]
    assert.equal(refreshedWallet.address, addressB)
    assert.deepEqual(refreshedWallet.addresses, [addressB, addressC])
    assert.deepEqual(refreshedWallet, { ...cachedWallet, address: addressB, addresses: [addressB, addressC] })
    assert.equal(service.buildProvider().activeWallet.address, addressB)
    assert.deepEqual(useFuelStore.getState().connectedWallets.map(w => w.id), ['Fuel Wallet', 'Fuelet'])
    assert.equal(networkQuery.mock.callCount(), 1)

    fuelWallet.authorizedAccounts = []
    await service.syncConnectedWallets()
    assert.deepEqual(useFuelStore.getState().connectedWallets.map(w => w.id), ['Fuelet'])
    assert.equal(networkQuery.mock.callCount(), 1)
})

test('a failed query cannot create a wallet without a last known snapshot', async t => {
    const fuelWallet = connector()
    const fuelet = connector('Fuelet', [addressC])
    t.mock.method(fuelWallet, 'accounts', async () => { throw new Error('temporary query failure') })
    t.mock.method(console, 'error', () => {})
    useFuelStore.getState()._setConnectors([fuelWallet, fuelet])
    await new FuelConnectionService().syncConnectedWallets()
    assert.deepEqual(useFuelStore.getState().connectedWallets.map(w => w.id), ['Fuelet'])
})

test('a disconnection during a failing query removes the last known wallet', async t => {
    const fuelWallet = connector()
    useFuelStore.getState()._setConnectors([fuelWallet])
    const service = new FuelConnectionService()
    await service.syncConnectedWallets()
    let rejectAccounts
    t.mock.method(fuelWallet, 'accounts', () => new Promise((_, reject) => { rejectAccounts = reject }))
    t.mock.method(console, 'error', () => {})
    const pending = service.syncConnectedWallets()
    fuelWallet.connected = false
    rejectAccounts(new Error('connection ended'))
    await pending
    assert.deepEqual(useFuelStore.getState().connectedWallets, [])
})

test('a disconnection during a successful network query removes the last known wallet', async t => {
    const fuelWallet = connector()
    useFuelStore.getState()._setConnectors([fuelWallet])
    const service = new FuelConnectionService()
    await service.syncConnectedWallets()
    let resolveNetwork
    t.mock.method(fuelWallet, 'currentNetwork', () => new Promise(resolve => { resolveNetwork = resolve }))
    const pending = service.syncConnectedWallets()
    await settle()
    fuelWallet.connected = false
    resolveNetwork({ chainId: 9889, url: 'https://mainnet.fuel.network' })
    await pending
    assert.deepEqual(useFuelStore.getState().connectedWallets, [])
})

test('an older failing sync cannot restore its cached account over a newer snapshot', async t => {
    const fuelWallet = connector()
    useFuelStore.getState()._setConnectors([fuelWallet])
    await new FuelConnectionService().syncConnectedWallets()
    let rejectOldAccounts
    fuelWallet.accounts = () => new Promise((_, reject) => { rejectOldAccounts = reject })
    t.mock.method(console, 'error', () => {})
    const older = new FuelConnectionService().syncConnectedWallets()
    fuelWallet.accounts = async () => [addressB]
    await new FuelConnectionService().syncConnectedWallets()
    rejectOldAccounts(new Error('temporary query failure'))
    await older
    assert.deepEqual(useFuelStore.getState().connectedWallets.map(w => w.address), [addressB])
})

test('an older sync from another service cannot restore a revoked account', async () => {
    const fuelWallet = connector()
    useFuelStore.getState()._setConnectors([fuelWallet])
    let resolveOldAccounts
    fuelWallet.accounts = () => new Promise(resolve => { resolveOldAccounts = resolve })
    const older = new FuelConnectionService().syncConnectedWallets()
    fuelWallet.accounts = async () => [addressB]
    await new FuelConnectionService().syncConnectedWallets()
    resolveOldAccounts([addressA])
    await older
    assert.deepEqual(useFuelStore.getState().connectedWallets.map(w => w.address), [addressB])
})

test('disconnect invalidates an account query already in flight', async () => {
    const fuelWallet = connector()
    useFuelStore.getState()._setConnectors([fuelWallet])
    useFuelStore.getState().connectWallet(wallet('Fuel Wallet', addressA))
    let resolveNetwork
    fuelWallet.currentNetwork = () => new Promise(resolve => { resolveNetwork = resolve })
    const service = new FuelConnectionService()
    const older = service.syncConnectedWallets()
    await settle()
    await service.disconnectWallet('Fuel Wallet')
    resolveNetwork({ chainId: 9889, url: 'https://mainnet.fuel.network' })
    await older
    assert.deepEqual(useFuelStore.getState().connectedWallets, [])
})

test('account and permission events refresh every connector, including a non-current wallet', async t => {
    const fuelWallet = connector()
    const fuelet = connector('Fuelet', [addressC])
    const fuel = Object.assign(new EventEmitter(), { connectors: async () => [fuelWallet, fuelet] })
    const service = new FuelConnectionService()
    t.after(registerFuelWalletSynchronizer(() => service.syncConnectedWallets()))
    const dispose = attachFuelSync(fuel)
    t.after(dispose)
    await settle()

    fuelWallet.authorizedAccounts = [addressB]
    fuelWallet.emit(FuelConnectorEventTypes.accounts, [addressB])
    await settle()
    assert.deepEqual(useFuelStore.getState().connectedWallets.map(w => w.address), [addressB, addressC])

    fuelWallet.authorizedAccounts = [addressA, addressB]
    fuelWallet.emit(FuelConnectorEventTypes.currentAccount, addressA)
    await settle()
    assert.deepEqual(useFuelStore.getState().connectedWallets[0].addresses, [addressA, addressB])

    fuelet.connected = false
    fuelet.emit(FuelConnectorEventTypes.connection, false)
    await settle()
    assert.deepEqual(useFuelStore.getState().connectedWallets.map(w => w.id), ['Fuel Wallet'])
    dispose()
    for (const event of [FuelConnectorEventTypes.accounts, FuelConnectorEventTypes.currentAccount,
        FuelConnectorEventTypes.connection, FuelConnectorEventTypes.currentNetwork]) {
        assert.equal(fuelWallet.listenerCount(event), 0)
        assert.equal(fuelet.listenerCount(event), 0)
    }
})

test('disposing an in-flight connector refresh does not reattach account listeners', async () => {
    const fuelWallet = connector()
    let resolveConnectors
    const fuel = Object.assign(new EventEmitter(), {
        connectors: () => new Promise(resolve => { resolveConnectors = resolve }),
    })
    const dispose = attachFuelSync(fuel)
    dispose()
    resolveConnectors([fuelWallet])
    await settle()
    assert.equal(fuelWallet.listenerCount(FuelConnectorEventTypes.accounts), 0)
    assert.deepEqual(useFuelStore.getState().connectors, [])
})

function transferFixture(t, accounts = [addressA, addressB]) {
    const fuelWallet = connector('Fuel Wallet', accounts)
    const otherWallet = connector('Fuelet', [addressC])
    let currentConnector = fuelWallet
    setFuelInstance({
        getConnector: name => [fuelWallet, otherWallet].find(c => c.name === name),
        currentConnector: () => currentConnector,
        getWallet: () => assert.fail('the transfer must not bind to the mutable SDK current connector'),
    })
    const owners = []
    t.mock.method(ScriptTransactionRequest.prototype, 'estimateAndFund', async account => {
        owners.push(account.address.toB256())
    })
    const simulate = t.mock.method(Provider.prototype, 'simulate', async () => { currentConnector = otherWallet })
    // Keep the SDK's sendTransaction dispatch real; stub its network preparation.
    t.mock.method(Account.prototype, 'setTransactionStateForConnectors', async ({ transactionRequest }) => ({
        transactionRequest, connectorsSendTxParams: {},
    }))
    const send = t.mock.method(fuelWallet, 'sendTransaction', async () => ({ id: 'fuel-transaction' }))
    t.mock.method(otherWallet, 'sendTransaction', async () => assert.fail('must not send through the current SDK connector'))
    const params = {
        sourceAddress: addressB,
        selectedWallet: wallet('Fuel Wallet', addressA),
        network: { name: 'FUEL_MAINNET', chain_id: '9889', node_url: 'https://mock.fuel.example' },
        callData: JSON.stringify({ script: {}, quantities: [] }),
        swapId: 'fuel-swap',
    }
    return { fuelWallet, send, simulate, owners, params, transfer: createFuelTransfer() }
}

test('transfer uses the requested authorized sender and stays bound to its selected connector', async t => {
    const fixture = transferFixture(t, [new Address(addressA).toChecksum(), new Address(addressB).toChecksum()])
    const hash = await fixture.transfer.executeTransfer(fixture.params)
    assert.equal(hash, 'fuel-transaction')
    assert.deepEqual(fixture.owners, [addressB])
    assert.equal(new Address(fixture.send.mock.calls[0].arguments[0]).toB256(), addressB)
})

test('transfers without sourceAddress still use the selected wallet primary account', async t => {
    const fixture = transferFixture(t)
    delete fixture.params.sourceAddress
    await fixture.transfer.executeTransfer(fixture.params)
    assert.deepEqual(fixture.owners, [addressA])
})

function expectUnauthorized(error) {
    assert.equal(error.name, 'WaletMismatch')
    assert.equal(normalizeWalletErrorCode(error), 'unauthorized')
    assert.equal(isUserRejection(error), false)
    return true
}

for (const disconnected of [false, true]) {
    test(`an unauthorized sender is blocked before preparation or sending (disconnected: ${disconnected})`, async t => {
        const fixture = transferFixture(t, [addressA])
        fixture.fuelWallet.connected = !disconnected
        await assert.rejects(fixture.transfer.executeTransfer(fixture.params), expectUnauthorized)
        assert.deepEqual(fixture.owners, [])
        assert.equal(fixture.simulate.mock.callCount(), 0)
        assert.equal(fixture.send.mock.callCount(), 0)
    })
}

test('permissions revoked during preparation block the send request', async t => {
    const fixture = transferFixture(t)
    t.mock.method(Provider.prototype, 'simulate', async () => { fixture.fuelWallet.authorizedAccounts = [addressA] })
    await assert.rejects(fixture.transfer.executeTransfer(fixture.params), expectUnauthorized)
    assert.deepEqual(fixture.owners, [addressB])
    assert.equal(fixture.send.mock.callCount(), 0)
})

test('an authorization error from the wallet keeps its cause and is reported as a failure', async t => {
    const fixture = transferFixture(t)
    const original = { code: -32603, message: 'address is not authorized for this connection.' }
    t.mock.method(fixture.fuelWallet, 'sendTransaction', async () => { throw original })
    await assert.rejects(fixture.transfer.executeTransfer(fixture.params), error => {
        expectUnauthorized(error)
        assert.equal(error.cause, original)
        assert.equal(error.message, original.message)
        return true
    })
})

test('Fuel chain resolution retains numeric 0 without querying the RPC', async t => {
    t.mock.method(globalThis, 'fetch', () => assert.fail('a reported chain ID must not trigger RPC discovery'))
    assert.equal(resolveFuelChainId({ chainId: 0 }), 0)
})

for (const hasCachedWallet of [false, true]) {
    test(`unknown legacy networks cannot block wallet restoration (cached wallet: ${hasCachedWallet})`, async t => {
        const legacy = connector('Legacy Fuel Wallet')
        legacy.currentNetwork = async () => ({ url: 'https://stalled-legacy.fuel.example' })
        const healthy = connector('Fuelet', [addressC])
        useFuelStore.getState()._setConnectors([legacy, healthy])
        if (hasCachedWallet) {
            useFuelStore.getState().connectWallet({ ...wallet(legacy.name, addressA), chainId: 9889 })
        }

        const fetch = t.mock.method(globalThis, 'fetch', () => assert.fail('restoration must not query the node'))
        const healthyNetwork = t.mock.method(healthy, 'currentNetwork', healthy.currentNetwork)
        t.mock.method(console, 'error', () => {})

        await new FuelConnectionService().syncConnectedWallets()

        assert.equal(fetch.mock.callCount(), 0)
        assert.equal(healthyNetwork.mock.callCount(), 1)
        const wallets = useFuelStore.getState().connectedWallets
        assert.deepEqual(wallets.map(w => w.id), [legacy.name, healthy.name])
        assert.equal(wallets[0].chainId, undefined, 'unknown metadata must not retain a stale mainnet guess')
    })
}

test('legacy network metadata follows configured RPC URLs, including updates with unchanged network IDs', async t => {
    const fuelWallet = connector()
    t.mock.method(fuelWallet, 'currentNetwork', async () => ({ url: 'https://custom.fuel.example/' }))
    t.mock.method(globalThis, 'fetch', () => assert.fail('metadata resolution must not query the node'))
    const adapter = {
        getId: network => network.name,
        getChainId: network => network.chainId,
        getRpcUrls: network => network.rpcUrls,
        getIcon: () => undefined,
        isFuelNetwork: () => true,
    }
    const service = new FuelConnectionService()
    service.setNetworks([{ name: 'custom', chainId: 0, rpcUrls: ['https://custom.fuel.example'] }], adapter)
    assert.equal((await service.resolveFuelWallet(fuelWallet, addressA, [addressA])).chainId, 0)

    service.setNetworks([{ name: 'custom', chainId: 0, rpcUrls: ['https://new.fuel.example'] }], adapter)
    assert.equal((await service.resolveFuelWallet(fuelWallet, addressA, [addressA])).chainId, undefined)
})

test('the connection provider checks live readiness even when the published wallet chain is stale', async () => {
    const fuelWallet = connector()
    let chainId = 0
    let switches = 0
    let starts = 0
    fuelWallet.currentNetwork = async () => ({ chainId })
    fuelWallet.selectNetwork = async target => { switches++; chainId = target.chainId; return true }
    useFuelStore.getState()._setConnectors([fuelWallet])
    const provider = new FuelConnectionService().buildProvider()
    await provider.ensureChain({ ...wallet('Fuel Wallet', addressA), chainId: 9889 }, '9889', {
        onSwitchStart: () => { starts++ },
    })
    assert.equal(switches, 1)
    assert.equal(starts, 1)
    assert.equal(chainId, 9889)
})

test('a connector on testnet cannot prepare a mainnet transaction despite a stale wallet snapshot', async t => {
    const fixture = transferFixture(t)
    t.mock.method(fixture.fuelWallet, 'currentNetwork', async () => ({ chainId: 0 }))
    await assert.rejects(fixture.transfer.executeTransfer(fixture.params), /Switch your Fuel wallet to FUEL_MAINNET/)
    assert.deepEqual(fixture.owners, [])
    assert.equal(fixture.simulate.mock.callCount(), 0)
    assert.equal(fixture.send.mock.callCount(), 0)
})

test('a network change during preparation blocks submission', async t => {
    const fixture = transferFixture(t)
    t.mock.method(Provider.prototype, 'simulate', async () => {
        fixture.fuelWallet.currentNetwork = async () => ({ chainId: 0 })
    })
    await assert.rejects(fixture.transfer.executeTransfer(fixture.params), /Switch your Fuel wallet/)
    assert.deepEqual(fixture.owners, [addressB])
    assert.equal(fixture.send.mock.callCount(), 0)
})

for (const chainId of [0, 9889]) {
    test(`a confirmed chain switch to ${chainId} succeeds`, async t => {
        const fuelWallet = connector()
        fuelWallet.selectNetwork = async () => true
        t.mock.method(fuelWallet, 'currentNetwork', async () => ({ chainId }))
        useFuelStore.getState()._setConnectors([fuelWallet])
        await new FuelConnectionService().switchChain(wallet('Fuel Wallet', addressA), String(chainId))
    })
}

test('a successful selectNetwork response cannot hide a wallet still on the wrong chain', async t => {
    const fuelWallet = connector()
    fuelWallet.selectNetwork = async () => true
    t.mock.method(fuelWallet, 'currentNetwork', async () => ({ chainId: 0 }))
    t.mock.method(console, 'error', () => {})
    useFuelStore.getState()._setConnectors([fuelWallet])
    await assert.rejects(new FuelConnectionService().switchChain(wallet('Fuel Wallet', addressA), '9889'), /still on chain 0/)
})

test('the observed funding rejection has an insufficient-funds UI label and preserves the RPC cause', async t => {
    const fixture = transferFixture(t)
    const original = Object.assign(new Error(
        'Insufficient funds.\nAsset ID: ETH.\nThe Fuel Node is using fuel-core version 0.48.3; SDK supports 0.43.1.'
    ), { code: 'not-enough-funds' })
    t.mock.method(ScriptTransactionRequest.prototype, 'estimateAndFund', async () => { throw original })
    await assert.rejects(fixture.transfer.executeTransfer(fixture.params), error => {
        assert.equal(error.name, 'InsufficientFunds')
        assert.equal(normalizeWalletErrorCode(error), 'insufficient_funds')
        assert.equal(error.cause, original)
        return true
    })
    assert.equal(fixture.simulate.mock.callCount(), 0)
    assert.equal(fixture.send.mock.callCount(), 0)
})
