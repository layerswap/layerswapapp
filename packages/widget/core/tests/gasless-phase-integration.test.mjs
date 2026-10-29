import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, useLayoutEffect, useRef, useState } from 'react'
import { createSwapContext } from './helpers/swap-context.mjs'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.test' })
const previous = Object.getOwnPropertyDescriptors(globalThis)
const globals = {
    window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
}
for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}

// Keep real SWR, phase resolution, action observation, receipts and submission completion.
// Replace the HTTP boundary and services unrelated to gasless submission.
const apiModule = 'data:text/javascript,' + encodeURIComponent(`
    export const BackendTransactionStatus = { Initiated: 'initiated', Pending: 'pending', Completed: 'completed', Failed: 'failed' };
    export const TransactionStatus = { Pending: 'pending', Completed: 'completed', Failed: 'failed' };
    export const TransactionType = { Input: 'input', Output: 'output', Refuel: 'refuel', Refund: 'refund' };
    export default class Client {
        fetcher = key => globalThis.__gaslessPhaseTransport(key);
        GetDepositActionsAsync(id, address) { return this.fetcher('/swaps/' + id + '/deposit_actions?source_address=' + address); }
        GetGaslessAuthorizationAsync(id) { return this.fetcher('/swaps/' + id + '/authorize'); }
        GetTransactionStatus(network, hash) { return this.fetcher([network, hash]); }
    }
`)
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier === '@layerswap/wallet-core' && context.parentURL?.endsWith('/depositExecution.js')) return {
        url: new URL('../../../wallets/core/dist/esm/lib/swapPrerequisites.js', import.meta.url).href, shortCircuit: true,
    }
    if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) return { url: apiModule, shortCircuit: true }
    if (specifier.endsWith('/context/swap')) return {
        url: 'data:text/javascript,' + encodeURIComponent(`
            export const { useSwapDataState, useSwapDataUpdate } = globalThis.__gaslessPhaseContext;
        `), shortCircuit: true,
    }
    if (specifier.endsWith('/lib/ErrorHandler')) return {
        url: 'data:text/javascript,export const ErrorHandler = () => {};', shortCircuit: true,
    }
    if (specifier.endsWith('/lib/swapLifecycle')) return {
        url: 'data:text/javascript,' + encodeURIComponent(`
            export const lifecycleContextFromSwap = () => ({});
            export const lifecycleErrorDetails = () => ({});
        `), shortCircuit: true,
    }
    if (specifier.endsWith('/lib/widgetTelemetry')) return {
        url: 'data:text/javascript,export const widgetTelemetry = { beginOperation: () => () => {} };', shortCircuit: true,
    }
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
        return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
} })
const { createRoot } = await import('react-dom/client')
const swr = await import('swr')
const { SWRConfig, useSWRConfig } = swr
const api = await import(apiModule)
const gasless = await import('../dist/esm/helpers/gasless.js')
const depositActions = await import('../dist/esm/helpers/depositActions.js')
const phases = await import('../dist/esm/components/utils/resolveSwapPhase.js')
const authorizationStatus = await import('../dist/esm/hooks/useGaslessAuthorizationStatus.js')
const authorizationFailure = await import('../dist/esm/hooks/useGaslessAuthorization.js')
const stores = await import('../dist/esm/stores/swapTransactionStore.js')

const account = { id: 'wallet', address: 'source' }
const network = { name: 'BASE_MAINNET' }
const details = {
    id: 'gasless-swap', status: 'user_transfer_pending', transactions: [],
    source_network: network, destination_network: network, source_token: {}, destination_token: {},
    requested_amount: '1', use_deposit_address: false,
}
const context = createSwapContext({
    Client: api.default, getSwapId: () => details.id, getAccount: () => account, stores, swr,
    overrides: {
        '@/helpers/gasless': gasless,
        '@/helpers/depositActions': depositActions,
        '@/components/utils/resolveSwapPhase': phases,
        '@/hooks/useGaslessAuthorizationStatus': authorizationStatus,
        '@/hooks/useGaslessAuthorization': authorizationFailure,
        '@/hooks/useSwapPolling': { useSwapPolling: () => ({ data: { data: { swap: details } }, mutate() {} }) },
    },
})
globalThis.__gaslessPhaseContext = context
const { useDepositActionPolling } = await import('../dist/esm/hooks/useDepositActionPolling.js')
const { completeGaslessSubmission } = await import('../dist/esm/components/Pages/Swap/Withdraw/Wallet/Common/depositExecution.js')

let root, container, config, actions, authorization, requests, observed, startSubmission, refreshAuthorization
let submissionErrors, lifecycle, successes, unmountedAfterSuccess
function WalletControls() {
    const [executing, setExecuting] = useState(false)
    const scope = useRef()
    const polling = useDepositActionPolling(details.id, account.address, executing)
    useLayoutEffect(() => {
        scope.current = new AbortController()
        return () => {
            unmountedAfterSuccess = successes > 0
            scope.current.abort()
        }
    }, [])
    startSubmission = async () => {
        setExecuting(true)
        stores.useGaslessAuthorizationStore.getState().setGaslessAuthorization(details.id, 2000000000)
        try {
            const transition = await polling.waitForTransition({
                swapId: details.id, sourceAddress: account.address, previousAction: actions[0], signal: scope.current.signal,
            })
            scope.current.signal.throwIfAborted()
            completeGaslessSubmission({
                swapData: details, swapBasicData: details, selectedWallet: { providerName: 'test' },
                setSwapTransaction: stores.useSwapTransactionStore.getState().setSwapTransaction,
                cacheGaslessAuthorization() {}, onLifecycle: event => lifecycle.push(event), onSuccess: () => successes++,
            }, transition.authorization)
        } catch (error) {
            submissionErrors.push(error)
        } finally {
            setExecuting(false)
        }
    }
    return createElement('button', null, executing ? 'Preparing transaction' : 'Sign to swap')
}
function Screen() {
    observed = context.useSwapDataState()
    const { mutate } = useSWRConfig()
    refreshAuthorization = async result => {
        authorization = result
        await mutate(gasless.gaslessAuthorizationKey(details.id))
    }
    return observed.resolved.showWithdrawScreen
        ? createElement(WalletControls)
        : createElement('output', null, 'Processing')
}
const render = () => act(async () => root.render(createElement(SWRConfig, { value: config },
    createElement(context.SwapDataProvider, null, createElement(Screen)))))

beforeEach(() => {
    details.transactions = []
    localStorage.clear()
    stores.useGaslessAuthorizationStore.setState({ authorizations: {} })
    stores.useDepositSignatureStore.setState({ signatures: {} })
    stores.useSwapTransactionStore.setState({ swapTransactions: {}, stepTransactions: {}, pendingSubmissions: {} })
    actions = [{ type: 'sign', step: 'sign', signing_standard: 'permit2', status: 'action_required' }]
    authorization = { status: 'initiated' }
    requests = []; submissionErrors = []; lifecycle = []
    successes = 0; unmountedAfterSuccess = undefined
    observed = undefined; startSubmission = undefined
    config = { provider: () => new Map(), revalidateOnFocus: false, revalidateOnReconnect: false }
    globalThis.__gaslessPhaseTransport = async key => {
        requests.push(key)
        if (Array.isArray(key)) return { data: { status: 'pending' } }
        return { data: key.endsWith('/authorize') ? authorization : actions }
    }
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    delete globalThis.__gaslessPhaseTransport
})
after(() => {
    hooks.deregister()
    dom.window.close()
    delete globalThis.__gaslessPhaseContext
    for (const key of Object.keys(globals)) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
        else delete globalThis[key]
    }
})

test('an unsigned initiated authorization keeps the signing controls mounted', async () => {
    await render()
    assert.ok(requests.includes(gasless.gaslessAuthorizationKey(details.id)))
    assert.deepEqual(stores.useGaslessAuthorizationStore.getState().authorizations, {})
    assert.equal(observed.resolved.phase, 'awaiting_user_deposit')
    assert.equal(container.querySelector('button')?.textContent, 'Sign to swap')
})

test('a recovered signature awaiting publication does not invent a submitted deposit', async () => {
    actions = [{ ...actions[0], signing_standard: 'eip3009', status: 'completed' }]
    stores.useGaslessAuthorizationStore.getState().setGaslessAuthorization(details.id, 1)
    await render()
    assert.equal(observed.gaslessAuthorization.status, 'initiated')
    assert.equal(observed.resolved.phase, 'awaiting_user_deposit')
    assert.equal(observed.resolved.failureReason, undefined)
    assert.ok(container.querySelector('button'))
})

for (const result of [
    { status: 'published' },
    { status: 'published', transaction: { transaction_hash: 'gasless-hash', status: 'pending' } },
    { status: 'initiated', transaction: { transaction_hash: 'gasless-hash', status: 'pending' } },
    { status: 'completed' },
]) {
    test(`${result.status} ${result.transaction ? 'with a transaction' : 'without a hash'} preserves execution until submission success`, async () => {
        actions = [{ ...actions[0], signing_standard: 'eip3009' }]
        await render()
        let pending
        await act(async () => { pending = startSubmission() })
        assert.equal(container.querySelector('button')?.textContent, 'Preparing transaction')
        assert.equal(successes, 0)
        await act(async () => { await refreshAuthorization(result); await pending })
        assert.deepEqual(submissionErrors, [])
        assert.equal(successes, 1)
        assert.deepEqual(lifecycle.map(event => event.step), ['gasless_authorization_submitted'])
        assert.equal(unmountedAfterSuccess, true, 'phase changes must not abort the submission wait before its callback')
        assert.equal(container.textContent, 'Processing')
        assert.equal(observed.resolved.phase, 'input_pending')
    })
}

test('reopening a published gasless swap resumes processing without signature receipts', async () => {
    actions = [{ ...actions[0], signing_standard: 'eip3009', status: 'completed' }]
    authorization = { status: 'published' }
    await render()
    await act(async () => root.unmount())
    config = { ...config, provider: () => new Map() }
    root = createRoot(container)
    await render()
    assert.deepEqual(stores.useGaslessAuthorizationStore.getState().authorizations, {})
    assert.equal(observed.resolved.phase, 'input_pending')
    assert.equal(container.textContent, 'Processing')
    assert.equal(successes, 0, 'recovery must not replay a local submission callback')
})

test('a backend input arriving during publication cannot cancel the submission callback', async () => {
    actions = [{ ...actions[0], signing_standard: 'eip3009' }]
    await render()
    let pending
    await act(async () => { pending = startSubmission() })
    details.transactions = [{ type: 'input', transaction_hash: 'gasless-hash', status: 'completed',
        confirmations: 1, max_confirmations: 1 }]
    await act(async () => { await refreshAuthorization({ status: 'published' }); await pending })
    assert.deepEqual(submissionErrors, [])
    assert.equal(successes, 1)
    assert.equal(unmountedAfterSuccess, true)
    assert.equal(observed.resolved.phase, 'output_pending', 'backend evidence still determines the phase')
    assert.equal(container.textContent, 'Processing')
})
