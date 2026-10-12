import assert from 'node:assert/strict'
import test, { after, mock } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { EventEmitter } from 'node:events'
import { PublicKey } from '@solana/web3.js'

const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && !extname(specifier)) {
            const extension = context.parentURL?.includes('/src/') ? '.ts' : '.js'
            try { return nextResolve(`${specifier}${extension}`, context) } catch { return nextResolve(`${specifier}/index${extension}`, context) }
        }
        return nextResolve(specifier, context)
    },
})
let provider
mock.module('@walletconnect/universal-provider', {
    namedExports: { UniversalProvider: { init: async () => provider } },
})
const { SolanaWalletConnectAdapter } = await import('../src/connectors/SolanaWalletConnectAdapter.ts')
const { SolanaWalletConnectChain } = await import('../src/constants.ts')
const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
after(() => {
    hooks.deregister()
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator)
    else delete globalThis.navigator
    delete globalThis.window
    delete globalThis.localStorage
})

test('the Solana adapter opens the current session wallet only after sending its transaction request', async () => {
    const events = []
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'iPhone' } })
    globalThis.window = {
        addEventListener() {},
        location: { set href(value) { events.push({ redirect: value }) } },
    }
    globalThis.localStorage = {
        getItem: key => key === 'WALLETCONNECT_DEEPLINK_CHOICE' ? JSON.stringify({ href: 'metamask://' }) : null,
    }
    const session = {
        topic: 'phantom-solana-session',
        namespaces: { solana: { accounts: [`${SolanaWalletConnectChain.Mainnet}:${PublicKey.default.toBase58()}`] } },
        peer: { metadata: { name: 'Phantom', redirect: { native: 'phantom://' } } },
    }
    const sessions = new Map([[session.topic, session]])
    const client = Object.assign(new EventEmitter(), {
        session: {
            get: topic => sessions.get(topic),
            getAll: () => [...sessions.values()],
            update: async (topic, update) => sessions.set(topic, { ...sessions.get(topic), ...update }),
        },
        request: async ({ topic, chainId, request }) => {
            assert.equal(sessions.get(topic).sessionConfig.disableDeepLink, true)
            events.push({ sent: request.method })
            client.emit('session_request_sent', { topic, chainId, id: 123 })
            return { signature: 'transaction-signature' }
        },
    })
    provider = Object.assign(new EventEmitter(), { client, session, setDefaultChain() {} })
    const adapter = new SolanaWalletConnectAdapter({ network: 'mainnet-beta', options: { projectId: 'test' } })
    await adapter.connect()
    assert.deepEqual(events, [], 'restoring the session must not open an app')
    const signature = await adapter.signAndSendTransaction({ serialize: () => Buffer.from([1]) })
    assert.equal(signature, 'transaction-signature')
    assert.deepEqual(events, [
        { sent: 'solana_signAndSendTransaction' },
        { redirect: 'phantom://wc?requestId=123&sessionTopic=phantom-solana-session' },
    ])
})
