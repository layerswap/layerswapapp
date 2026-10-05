import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test, { beforeEach, after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
            try { return nextResolve(`${specifier}.js`, context) } catch { return nextResolve(`${specifier}/index.js`, context) }
        }
        return nextResolve(specifier, context)
    },
})
const { buildWalletRequestLink, subscribeWalletRequests } = await import('../dist/esm/lib/walletConnect/subscribeWalletRequests.js')
const { clearPendingDynamicWcMetadata, setDynamicWcMetadata, setPendingMetadataForRegistry } = await import('../dist/esm/lib/walletConnect/dynamicMetadata.js')

const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
const storage = new Map()
const redirects = []
globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
}
globalThis.window = {
    addEventListener() {},
    location: { set href(value) { redirects.push(value) } },
}
beforeEach(() => {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'iPhone', platform: 'iPhone' } })
    redirects.length = 0
    storage.set('WALLETCONNECT_DEEPLINK_CHOICE', JSON.stringify({ href: 'metamask://', name: 'MetaMask' }))
    clearPendingDynamicWcMetadata('eip155')
    clearPendingDynamicWcMetadata('solana')
})
after(() => {
    hooks.deregister()
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator)
    else delete globalThis.navigator
    delete globalThis.window
    delete globalThis.localStorage
})

function session(namespace = 'eip155', name = 'Rainbow', native = 'rainbow://') {
    return {
        topic: `${namespace}-${name}`,
        namespaces: { [namespace]: { accounts: [`${namespace}:1:address`] } },
        peer: { metadata: { name, redirect: { native } } },
    }
}

function clientFor(...sessions) {
    const events = new EventEmitter()
    const store = new Map(sessions.map(session => [session.topic, session]))
    return Object.assign(events, {
        session: {
            get: topic => store.get(topic),
            getAll: () => [...store.values()],
            update: async (topic, update) => store.set(topic, { ...store.get(topic), ...update }),
        },
        connect(session) {
            store.set(session.topic, session)
            events.emit('session_connect', { session })
        },
    })
}

test('iPhone Rainbow requests ignore a stale MetaMask choice and redirect only after publish', () => {
    const rainbow = session()
    const client = clientFor(rainbow)
    const unsubscribe = subscribeWalletRequests(client, 'eip155')
    assert.equal(client.session.get(rainbow.topic).sessionConfig.disableDeepLink, true)
    assert.deepEqual(redirects, [], 'preparing a transaction must not background Safari')

    client.emit('session_request_sent', { topic: rainbow.topic, chainId: 'eip155:1', id: 42 })
    assert.deepEqual(redirects, ['rainbow://wc?requestId=42&sessionTopic=eip155-Rainbow'])
    assert.equal(JSON.parse(storage.get('WALLETCONNECT_DEEPLINK_CHOICE')).href, 'metamask://', 'other connectors retain their own SDK setting')

    unsubscribe()
    assert.equal(client.listenerCount('session_request_sent'), 0)
    assert.equal(client.listenerCount('session_connect'), 0)
})

test('new Solana sessions and restored EVM sessions use their own wallet', () => {
    const rainbow = session()
    const phantom = session('solana', 'Phantom', 'phantom://')
    const client = clientFor(rainbow)
    const unsubscribeEvm = subscribeWalletRequests(client, 'eip155')
    const unsubscribeSvm = subscribeWalletRequests(client, 'solana')
    client.connect(phantom)
    assert.equal(client.session.get(phantom.topic).sessionConfig.disableDeepLink, true)
    client.emit('session_request_sent', { topic: phantom.topic, chainId: 'solana:1', id: 10 })
    client.emit('session_request_sent', { topic: rainbow.topic, chainId: 'eip155:1', id: 11 })
    assert.deepEqual(redirects, [
        'phantom://wc?requestId=10&sessionTopic=solana-Phantom',
        'rainbow://wc?requestId=11&sessionTopic=eip155-Rainbow',
    ])
    unsubscribeEvm()
    unsubscribeSvm()
})

test('registry metadata captures the selected mobile link and cannot override another session peer', () => {
    setDynamicWcMetadata('eip155', 'address', { name: 'MetaMask', id: 'metamask', icon: '', deepLink: 'metamask://' })
    const pending = setPendingMetadataForRegistry('eip155', {
        name: 'Rainbow', id: 'rainbow', mobile: { native: 'rainbow://' },
    })
    assert.equal(pending.deepLink, 'rainbow://')
    const rainbow = session('eip155', 'Rainbow', undefined)
    rainbow.peer.metadata.redirect = undefined
    const client = clientFor(rainbow)
    const unsubscribe = subscribeWalletRequests(client, 'eip155')
    client.emit('session_request_sent', { topic: rainbow.topic, chainId: 'eip155:1', id: 1 })
    assert.equal(redirects[0], 'rainbow://wc?requestId=1&sessionTopic=eip155-Rainbow')

    clearPendingDynamicWcMetadata('eip155')
    redirects.length = 0
    client.emit('session_request_sent', { topic: rainbow.topic, chainId: 'eip155:1', id: 2 })
    assert.deepEqual(redirects, [], 'an unknown peer link must not fall back to the previous wallet')
    unsubscribe()
})

test('MetaMask sessions use the universal link for signing on iOS', () => {
    const metamask = session('solana', 'MetaMask', 'metamask://')
    const client = clientFor(metamask)
    const unsubscribe = subscribeWalletRequests(client, 'solana')
    client.emit('session_request_sent', { topic: metamask.topic, chainId: 'solana:1', id: 1 })
    assert.equal(redirects[0], 'https://metamask.app.link/wc?requestId=1&sessionTopic=solana-MetaMask')
    unsubscribe()
})

test('desktop sessions keep SDK behavior and unsafe links never navigate', () => {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Desktop' } })
    const rainbow = session()
    const client = clientFor(rainbow)
    const unsubscribe = subscribeWalletRequests(client, 'eip155')
    assert.equal(client.session.get(rainbow.topic).sessionConfig, undefined)
    client.emit('session_request_sent', { topic: rainbow.topic, chainId: 'eip155:1', id: 1 })
    assert.deepEqual(redirects, [])
    unsubscribe()

    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'iPhone' } })
    rainbow.peer.metadata.redirect.native = 'javascript:alert(1)'
    const unsubscribeMobile = subscribeWalletRequests(client, 'eip155')
    client.emit('session_request_sent', { topic: rainbow.topic, chainId: 'eip155:1', id: 1 })
    assert.deepEqual(redirects, [])
    unsubscribeMobile()
})

test('request links preserve wallet paths without reusing the pairing URI or doubling /wc', () => {
    for (const link of ['okex://main/wc', 'rainbow://wc', 'https://wallet.example/wc', 'https://wallet.example/wc?uri=wc%3Aold']) {
        const result = new URL(buildWalletRequestLink(link, 3, 'current-topic'))
        assert.ok(!result.toString().includes('/wc/wc'))
        assert.equal(result.searchParams.get('uri'), null)
        assert.equal(result.searchParams.get('requestId'), '3')
        assert.equal(result.searchParams.get('sessionTopic'), 'current-topic')
    }
    const telegram = new URL(buildWalletRequestLink('https://t.me/wallet/start?mode=compact', 3, 'current-topic'))
    assert.equal(telegram.pathname, '/wallet/start')
    assert.equal(telegram.searchParams.get('mode'), 'compact')
    assert.equal(Buffer.from(telegram.searchParams.get('startapp'), 'base64url').toString(), 'requestId=3&sessionTopic=current-topic')
})

test('session peer redirects win over stale address metadata and link-mode requests are left to the SDK', () => {
    setDynamicWcMetadata('solana', 'address', { name: 'MetaMask', id: 'metamask', icon: '', deepLink: 'metamask://' })
    const phantom = session('solana', 'Phantom', 'phantom://')
    const client = clientFor(phantom)
    const unsubscribe = subscribeWalletRequests(client, 'solana')
    client.emit('session_request_sent', { topic: phantom.topic, chainId: 'solana:1', id: 1 })
    assert.equal(new URL(redirects[0]).protocol, 'phantom:')
    redirects.length = 0
    client.session.update(phantom.topic, { transportType: 'link_mode' })
    client.emit('session_request_sent', { topic: phantom.topic, chainId: 'solana:1', id: 2 })
    assert.deepEqual(redirects, [])
    unsubscribe()
})
