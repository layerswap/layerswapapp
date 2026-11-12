import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode, useLayoutEffect } from 'react'
import { createSwapContext } from './helpers/swap-context.mjs'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.test' })
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true })) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('/context/swap')) return {
        url: 'data:text/javascript,' + encodeURIComponent(`
            export const { useSwapDataState, useSwapDataUpdate } = globalThis.__depositSwapContext
        `), shortCircuit: true,
    }
    if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) return {
        url: 'data:text/javascript,' + encodeURIComponent(`
            export const TransactionType = { Input: 'input' }
            export const BackendTransactionStatus = { Pending: 'pending', Completed: 'completed', Failed: 'failed' }
            export default class Client {
                fetcher = key => globalThis.__depositTransport(key)
                GetDepositActionsAsync(id, address) {
                    return this.fetcher('/swaps/' + id + '/deposit_actions?source_address=' + address)
                }
                GetTransactionStatus() { throw new Error('Receipt polling belongs to swap context') }
                GetSwapAsync() { throw new Error('Deposit polling must not request the whole swap') }
            }
        `), shortCircuit: true,
    }
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
        return nextResolve(specifier + '.js', context)
    }
    return nextResolve(specifier, context)
} })
const { createRoot } = await import('react-dom/client')
const swr = await import('swr')
const { SWRConfig } = swr
let providerProps = {}
const swapTransactions = {}
const swapContext = createSwapContext({
    swr,
    swapTransactions,
    Client: class {
        fetcher = key => globalThis.__depositTransport(key)
        GetDepositActionsAsync(id, address) { return this.fetcher(`/swaps/${id}/deposit_actions?source_address=${address}`) }
        GetTransactionStatus(network, hash) { return globalThis.__depositTransport(['receipt', network, hash]) }
    },
    getSwapId: () => providerProps.id,
    getAccount: () => ({ id: 'wallet', address: providerProps.address }),
})
globalThis.__depositSwapContext = swapContext
const { useDepositActionPolling, depositActionsKey } = await import('../dist/esm/hooks/useDepositActionPolling.js')
const { useSwapTransactionStore } = await import('../dist/esm/stores/swapTransactionStore.js')

const sign = { type: 'sign', step: 'sign', status: 'action_required', typed_data: { message: { nonce: 'initial' } } }
const publish = { type: 'transfer', step: 'publish', status: 'waiting' }
const approvalCallData = amount => `0x095ea7b3${'123'.padStart(64, '0')}${BigInt(amount).toString(16).padStart(64, '0')}`
const approval = { type: 'transfer', step: 'approve_permit2', status: 'action_required', amount: 0,
    to_address: '0x456', call_data: approvalCallData(5841963) }
const waiting = () => ({ data: [{ ...sign, status: 'completed' }, publish] })
const ready = () => ({ data: [{ ...sign, status: 'completed' }, { ...publish, status: 'action_required' }] })
let root, container, result, config, requests, response, failure, authorization, receipts, receiptFailure, onReceipt
function SwapView({ id, children }) {
    const { setSwapId, setSwapViewMounted } = swapContext.useSwapDataUpdate()
    useLayoutEffect(() => { setSwapId(id) }, [id])
    useLayoutEffect(() => {
        setSwapViewMounted(true)
        return () => setSwapViewMounted(false)
    }, [])
    return children
}
function Withdrawal({ id, address, executing }) {
    result = useDepositActionPolling(id, address, executing)
    return createElement('output', null, result.data?.find(action => action.status === 'action_required')?.step ?? 'waiting')
}
const render = (props = {}) => {
    providerProps = { id: 's1', address: 'source', executing: true, ...props }
    return act(async () => root.render(createElement(StrictMode, null,
        createElement(SWRConfig, { value: config }, createElement(swapContext.SwapDataProvider, null,
            providerProps.swapView === false ? null : createElement(SwapView, { id: providerProps.id },
                providerProps.walletControls === false ? null : createElement(Withdrawal, providerProps)))))))
}
const wait = (signal, extra = {}) => {
    let pending
    act(() => { pending = result.waitForTransition({ swapId: 's1', sourceAddress: 'source', previousAction: sign, signal, ...extra }) })
    return pending
}

beforeEach(() => {
    useSwapTransactionStore.setState(useSwapTransactionStore.getInitialState(), true)
    for (const id of Object.keys(swapTransactions)) delete swapTransactions[id]
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    requests = []
    response = { data: [sign, publish] }
    failure = undefined
    authorization = { data: { status: 'initiated' } }
    receipts = new Map()
    receiptFailure = undefined
    onReceipt = undefined
    config = { provider: () => new Map(), revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false, isVisible: () => true }
    globalThis.__depositTransport = async key => {
        requests.push(key)
        if (Array.isArray(key)) {
            if (receiptFailure) throw receiptFailure
            const receipt = { data: { status: receipts.get(key[2]) ?? 'Pending' } }
            onReceipt?.(receipt)
            return receipt
        }
        if (failure) throw failure
        return key.endsWith('/authorize') ? authorization : response
    }
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    delete globalThis.__depositTransport
})
after(() => {
    hooks.deregister()
    dom.window.close()
    delete globalThis.__depositSwapContext
    for (const key of ['window', 'document', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT']) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
        else delete globalThis[key]
    }
})

test('one SWR request stream drives both the UI and a sign-to-publish wait longer than 20 seconds', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    await render()
    assert.deepEqual(requests, [depositActionsKey('s1', 'source')], 'context and withdrawal share the initial request')
    const scope = new AbortController()
    let settled = false
    const pending = wait(scope.signal).then(actions => { settled = true; return actions })
    const secondObserver = wait(scope.signal)
    assert.equal(requests.length, 1, 'waiting never starts another request')
    response = waiting()
    for (let i = 0; i < 14; i++) await act(async () => { t.mock.timers.tick(2000) })
    assert.equal(settled, false)
    assert.equal(container.textContent, 'waiting')
    response = ready()
    await act(async () => { t.mock.timers.tick(2000) })
    assert.deepEqual((await pending).actions, response.data)
    assert.deepEqual((await secondObserver).actions, result.data)
    assert.equal(container.textContent, 'publish')
    // The real provider shares the mount request and all 15 scheduled polls
    // with the withdrawal hook; neither observer starts a second request stream.
    assert.equal(requests.length, 16, 'waiting adds no requests to the single SWR polling stream')
    assert.ok(requests.every(key => key === depositActionsKey('s1', 'source')))
})

test('legacy signing waits for a different action type and resolves when transfer becomes available', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    const legacySign = { type: 'sign', typed_data: sign.typed_data }
    const legacyTransfer = { type: 'transfer', to_address: '0x123', amount: 1 }
    response = { data: [legacySign] }
    await render()
    const scope = new AbortController()
    let transition
    const pending = wait(scope.signal, { previousAction: legacySign }).then(value => { transition = value })
    try {
        for (let i = 0; i < 2; i++) await act(async () => { t.mock.timers.tick(2000) })
        assert.equal(transition, undefined, 'unchanged legacy signing must keep waiting')
        assert.ok(requests.includes('/swaps/s1/authorize'))
        response = { data: [legacyTransfer] }
        await act(async () => { t.mock.timers.tick(2000) })
        assert.deepEqual(result.data, [legacyTransfer], 'polling receives the transfer-only payload')
        assert.deepEqual(transition, { actions: [legacyTransfer] }, 'execution can continue without authorization submission')
        await pending
    } finally {
        act(() => scope.abort())
        await pending.catch(() => {})
    }
})

for (const step of ['approve_permit2', 'approve']) {
    test(`a mined partial ${step} resumes with identical calldata and waits for each submitted transaction`, async t => {
        t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
        const currentApproval = { ...approval, step }
        const nextSteps = step === 'approve' ? [{ ...publish, status: 'action_required' }] : [sign, publish]
        const workflow = action => [action, ...nextSteps.map(action => ({ ...action, status: 'pending' }))]
        response = { data: workflow(currentApproval) }
        await render()
        const scope = new AbortController()
        let transition
        const approvalTransaction = { network: 'BASE_MAINNET', hash: '0xpartial' }
        let pending = wait(scope.signal, { previousAction: currentApproval, approvalTransaction }).then(value => { transition = value })
        try {
            // A repeated poll or a fee refresh is not another approval request.
            response = { data: workflow({ ...currentApproval, gas_limit: '60000', fee: { amount: 0.000001 } }) }
            for (let i = 0; i < 2; i++) await act(async () => { t.mock.timers.tick(2000) })
            assert.equal(transition, undefined)

            // The wallet approved 3 USDT. The backend still asks for the same total
            // 5.841963 USDT allowance, not a delta of 2.841963 USDT.
            receipts.set('0xpartial', 'Completed')
            response = { data: workflow({ ...currentApproval }) }
            const beforeConfirmation = requests.length
            await act(async () => { t.mock.timers.tick(2000) })
            assert.deepEqual(transition, { actions: response.data }, 'receipt confirmation resumes an unchanged approval payload')
            const confirmationRequests = requests.slice(beforeConfirmation)
            const receiptIndex = confirmationRequests.findIndex(key => Array.isArray(key))
            assert.ok(confirmationRequests.slice(receiptIndex + 1).includes(depositActionsKey('s1', 'source')), 'actions are revalidated after confirmation')
            await pending
            assert.equal(container.textContent, step, 'the remaining approval is still the current step')

            transition = undefined
            pending = wait(scope.signal, { previousAction: currentApproval, approvalTransaction: { ...approvalTransaction, hash: '0xremaining' } }).then(value => { transition = value })
            response = { data: workflow({ ...currentApproval, gas_limit: '65000' }) }
            for (let i = 0; i < 2; i++) await act(async () => { t.mock.timers.tick(2000) })
            assert.equal(transition, undefined, 'the first receipt cannot confirm the second transaction')

            receipts.set('0xremaining', 'Completed')
            // Keep the polling snapshot stale until receipt confirmation. Only the
            // request made after that receipt sees the completed approval.
            onReceipt = receipt => {
                if (receipt.data.status === 'Completed') response = { data: [{ step, status: 'completed' }, ...nextSteps] }
            }
            await act(async () => { t.mock.timers.tick(2000) })
            assert.deepEqual(transition, { actions: response.data })
            await pending
            assert.equal(container.textContent, nextSteps[0].step)
            assert.ok(requests.every(key => Array.isArray(key) || key === depositActionsKey('s1', 'source')))
        } finally {
            act(() => scope.abort())
            await pending.catch(() => {})
        }
    })
}

test('changed approval calldata does not trigger a second transaction while the first is pending', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    response = { data: [approval] }
    await render()
    const scope = new AbortController()
    let settled = false
    const pending = wait(scope.signal, { previousAction: approval, approvalTransaction: { network: 'BASE_MAINNET', hash: '0xpending' } }).finally(() => { settled = true })
    const cancelled = assert.rejects(pending, { name: 'AbortError' })
    response = { data: [{ ...approval, call_data: approvalCallData(0) }] }
    for (let i = 0; i < 2; i++) await act(async () => { t.mock.timers.tick(2000) })
    assert.equal(settled, false)
    await act(async () => { scope.abort(); await cancelled })
})

for (const minedDuringRefresh of [false, true]) {
    test(`approval readiness ignores stale actions and ${minedDuringRefresh ? 'preserves a receipt mined during refresh' : 'recovers a replaced hash returning 404'}`, async t => {
        t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
        const direct = { ...approval, step: 'approve' }
        const unresolved = { data: [direct, { ...publish, status: 'pending' }] }
        const ready = { data: [{ step: 'approve', status: 'completed' }, { ...publish, status: 'action_required', call_data: 'fresh' }] }
        response = unresolved
        receiptFailure = Object.assign(new Error('Replaced hash not indexed'), { response: { status: 404 } })
        useSwapTransactionStore.getState().setStepTransaction('s1', 'approve', '0xreplaced', 'https://explorer.test/replaced')
        await render()
        const transport = globalThis.__depositTransport
        let actionReads = 0
        globalThis.__depositTransport = async key => {
            const result = await transport(key)
            if (key === depositActionsKey('s1', 'source')) return ++actionReads === 1 ? ready : unresolved
            return result
        }
        const scope = new AbortController()
        let transition
        const pending = wait(scope.signal, { previousAction: direct,
            approvalTransaction: { network: 'BASE_MAINNET', hash: '0xreplaced' } }).then(value => { transition = value })
        try {
            await act(async () => { t.mock.timers.tick(2000) })
            assert.ok(requests.some(key => Array.isArray(key) && key[2] === '0xreplaced'))
            assert.ok(actionReads >= 2, 'observed readiness triggers another action refresh')
            assert.equal(transition, undefined, 'stale readiness must not resume execution')
            assert.equal(useSwapTransactionStore.getState().stepTransactions.s1.approve.hash, '0xreplaced')
            let finishRefresh
            actionReads = 0
            globalThis.__depositTransport = async key => {
                const result = await transport(key)
                if (key === depositActionsKey('s1', 'source') && ++actionReads === 2 && minedDuringRefresh) {
                    return new Promise(resolve => { finishRefresh = () => resolve(result) })
                }
                return result
            }
            response = ready
            const before = requests.filter(key => key === depositActionsKey('s1', 'source')).length
            await act(async () => { t.mock.timers.tick(2000) })
            if (minedDuringRefresh) {
                assert.equal(typeof finishRefresh, 'function')
                receiptFailure = undefined
                receipts.set('0xreplaced', 'Completed')
                for (let i = 0; i < 4 && !useSwapTransactionStore.getState().stepTransactions.s1.approve.confirmed; i++) {
                    await act(async () => { t.mock.timers.tick(5000) })
                }
                assert.equal(useSwapTransactionStore.getState().stepTransactions.s1.approve.confirmed, true)
                await act(async () => { finishRefresh() })
            }
            await pending
            assert.deepEqual(transition.actions, ready.data)
            assert.ok(requests.filter(key => key === depositActionsKey('s1', 'source')).length >= before + 2)
            const receipt = useSwapTransactionStore.getState().stepTransactions.s1.approve
            if (minedDuringRefresh) {
                assert.equal(receipt.confirmed, true)
                assert.equal(receipt.explorerUrl, 'https://explorer.test/replaced')
            } else {
                assert.equal(receipt, undefined, 'a replaced hash is not a confirmed receipt')
            }
        } finally {
            act(() => scope.abort())
            await pending.catch(() => {})
        }
    })
}

for (const step of ['approve_permit2', 'approve']) {
    test(`a failed ${step} receipt ends the wait without retrying the transaction`, async () => {
        const currentApproval = { ...approval, step }
        response = { data: [currentApproval] }
        const otherStep = step === 'approve' ? 'approve_permit2' : 'approve'
        const store = useSwapTransactionStore.getState()
        store.setStepTransaction('s1', step, '0xfailed', 'https://explorer.test/failed')
        store.setStepTransaction('s1', otherStep, '0xother', 'https://explorer.test/other')
        receipts.set('0xfailed', 'Failed')
        await render()
        let rejected
        await act(async () => {
            rejected = assert.rejects(wait(new AbortController().signal, {
                previousAction: currentApproval, approvalTransaction: { network: 'BASE_MAINNET', hash: '0xfailed' },
            }), /token approval transaction failed/)
        })
        await rejected
        const transactions = useSwapTransactionStore.getState().stepTransactions.s1
        if (step === 'approve') {
            assert.equal(transactions.approve, undefined, 'failed direct approval is released for retry')
        }
        assert.equal(transactions[otherStep].hash, '0xother')
    })
}

for (const [scenario, step, httpStatus, refreshFails, released] of [
    ['cancelled approval', 'approve', 404, false, true],
    ['pending approval', 'approve', undefined, false, false],
    ['receipt service outage', 'approve', 503, false, false],
    ['failed action refresh', 'approve', 404, true, false],
    ['Permit2 approval', 'approve_permit2', 404, false, false],
]) {
    test(`${scenario}: timeout ${released ? 'releases' : 'retains'} its receipt for the next attempt`, async t => {
        t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
        const currentApproval = { ...approval, step }
        response = { data: [currentApproval, { ...publish, status: 'pending' }] }
        if (httpStatus) receiptFailure = Object.assign(new Error('Receipt unavailable'), { response: { status: httpStatus } })
        const store = useSwapTransactionStore.getState()
        store.setStepTransaction('s1', step, '0xmissing', 'https://explorer.test/missing')
        await render()
        const pending = wait(new AbortController().signal, { previousAction: currentApproval,
            approvalTransaction: { network: 'BASE_MAINNET', hash: '0xmissing' } })
        const rejected = assert.rejects(pending, released ? /try approving again/ : refreshFails ? /Refresh failed/ : /still confirming/)
        await act(async () => { t.mock.timers.tick(139999) })
        assert.equal(useSwapTransactionStore.getState().stepTransactions.s1[step].hash, '0xmissing', 'never release before the full timeout')
        if (refreshFails) failure = new Error('Refresh failed')
        await act(async () => { t.mock.timers.tick(1); await rejected })
        assert.equal(useSwapTransactionStore.getState().stepTransactions.s1[step]?.hash, released ? undefined : '0xmissing')
        assert.equal(useSwapTransactionStore.getState().swapTransactions.s1?.hash, undefined, 'timeout recovery does not submit the swap')
        if (released) assert.equal(requests.at(-1), depositActionsKey('s1', 'source'), 'recovery refreshes actions before allowing retry')
    })
}

test('approval receipt lookup retries an unindexed transaction before resuming', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    response = { data: [approval] }
    receiptFailure = Object.assign(new Error('Not indexed yet'), { response: { status: 404 } })
    await render()
    const scope = new AbortController()
    let transition
    const pending = wait(scope.signal, { previousAction: approval, approvalTransaction: { network: 'BASE_MAINNET', hash: '0xnew' } }).then(value => { transition = value })
    try {
        await act(async () => { t.mock.timers.tick(2000) })
        assert.equal(transition, undefined)
        receiptFailure = undefined
        receipts.set('0xnew', 'Completed')
        for (let i = 0; i < 4 && !transition; i++) await act(async () => { t.mock.timers.tick(5000) })
        assert.deepEqual(transition, { actions: [approval] })
        await pending
    } finally {
        act(() => scope.abort())
        await pending.catch(() => {})
    }
})

test('a failed post-confirmation refresh cannot resume from cached approval data', async () => {
    response = { data: [approval] }
    receipts.set('0xmined', 'Completed')
    await render()
    onReceipt = () => { failure = new Error('Fresh actions unavailable') }
    let rejected
    await act(async () => {
        rejected = assert.rejects(wait(new AbortController().signal, {
            previousAction: approval, approvalTransaction: { network: 'BASE_MAINNET', hash: '0xmined' },
        }), /Fresh actions unavailable/)
    })
    await rejected
})

test('cancelling an approval wait stops receipt polling while swap context stays mounted', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    response = { data: [approval] }
    await render()
    const scope = new AbortController()
    const pending = wait(scope.signal, {
        previousAction: approval, approvalTransaction: { network: 'BASE_MAINNET', hash: '0xcancelled' },
    })
    const cancelled = assert.rejects(pending, { name: 'AbortError' })
    await act(async () => { t.mock.timers.tick(2000) })
    assert.ok(requests.some(Array.isArray))
    await act(async () => { scope.abort(); await cancelled })
    const receiptRequests = requests.filter(Array.isArray).length
    await act(async () => { t.mock.timers.tick(6000) })
    assert.equal(requests.filter(Array.isArray).length, receiptRequests)
})

test('releasing an older wait cannot stop a newer approval in swap context', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    response = { data: [approval] }
    await render()
    const oldScope = new AbortController()
    const newScope = new AbortController()
    const oldWait = wait(oldScope.signal, {
        previousAction: approval, approvalTransaction: { network: 'BASE_MAINNET', hash: '0xold' },
    })
    const cancelled = assert.rejects(oldWait, { name: 'AbortError' })
    const newWait = wait(newScope.signal, {
        previousAction: approval, approvalTransaction: { network: 'BASE_MAINNET', hash: '0xnew' },
    })
    try {
        await act(async () => { oldScope.abort(); await cancelled })
        receipts.set('0xnew', 'Completed')
        await act(async () => { t.mock.timers.tick(2000) })
        assert.deepEqual(await newWait, { actions: [approval] })
    } finally {
        await act(async () => { newScope.abort(); await newWait.catch(() => {}) })
    }
})

for (const props of [{ id: 's2' }, { address: 'other-account' }]) {
    test(`approval polling stops when ${Object.keys(props)[0]} changes`, async t => {
        t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
        response = { data: [approval] }
        await render()
        const scope = new AbortController()
        let settled = false
        const pending = wait(scope.signal, {
            previousAction: approval, approvalTransaction: { network: 'BASE_MAINNET', hash: '0xold-account' },
        }).finally(() => { settled = true })
        const cancelled = assert.rejects(pending, { name: 'AbortError' })
        await act(async () => { t.mock.timers.tick(2000) })
        await render(props)
        const receiptRequests = requests.filter(Array.isArray).length
        receipts.set('0xold-account', 'Completed')
        await act(async () => { t.mock.timers.tick(6000) })
        assert.equal(requests.filter(Array.isArray).length, receiptRequests)
        assert.equal(settled, false, 'another swap or account cannot resume the old approval')
        await act(async () => { scope.abort(); await cancelled })
    })
}

test('idle polling continues after execution ends and uses the slower interval', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    await render()
    await render({ executing: false })
    const before = requests.length
    response = ready()
    await act(async () => { t.mock.timers.tick(4999) })
    assert.equal(requests.length, before)
    await act(async () => { t.mock.timers.tick(1) })
    assert.equal(requests.length, before + 1)
    assert.equal(container.textContent, 'publish')
})

test('the provider keeps refreshing after the wallet controls unmount, until the swap view closes', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    await render()
    await render({ walletControls: false })
    const processing = requests.length
    await act(async () => { t.mock.timers.tick(5000) })
    assert.equal(requests.length, processing + 1, 'the processing screen still reads fresh deposit actions')
    await render({ swapView: false })
    const closed = requests.length
    await act(async () => { t.mock.timers.tick(10000) })
    assert.equal(requests.length, closed)
})

test('refreshing continues after a local receipt until the swap API acknowledges the deposit', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    await render({ executing: false })
    const idle = requests.length
    await act(async () => { t.mock.timers.tick(5000) })
    assert.equal(requests.length, idle + 1)
    swapTransactions.s1 = { hash: '0xbroadcast', status: 'pending' }
    await render({ executing: false })
    const broadcast = requests.length
    await act(async () => { t.mock.timers.tick(10000) })
    assert.ok(requests.length > broadcast)
})

test('retry revalidates through SWR and never returns stale data after a failed or empty refresh', async () => {
    await render()
    response = { data: [{ ...sign, typed_data: { message: { nonce: 'fresh' } } }, publish] }
    let actions
    await act(async () => { actions = await result.refresh('s1', 'source') })
    assert.equal(actions[0].typed_data.message.nonce, 'fresh')
    assert.equal(requests.length, 2)
    failure = new Error('Refresh unavailable')
    await act(async () => { await assert.rejects(result.refresh('s1', 'source'), /Refresh unavailable/) })
    assert.equal(result.data[0].typed_data.message.nonce, 'fresh', 'cached UI data remains visible')
    failure = undefined
    response = { data: [] }
    await act(async () => { await assert.rejects(result.refresh('s1', 'source'), /No deposit actions/) })
})

test('a newly created swap can start waiting before its SWR subscription mounts', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    await render({ id: undefined })
    const pending = wait(new AbortController().signal)
    assert.equal(requests.length, 0)
    response = ready()
    await render()
    assert.deepEqual((await pending).actions, response.data)
    assert.equal(requests.length, 1)
})

test('waiting after a retry reads the refreshed cache before React commits its next render', async () => {
    response = ready()
    await render()
    const scope = new AbortController()
    let settled = false
    let pending
    await act(async () => {
        response = { data: [sign, publish] }
        await result.refresh('s1', 'source')
        pending = wait(scope.signal).then(actions => { settled = true; return actions })
        await Promise.resolve()
        assert.equal(settled, false, 'the old publication payload cannot resume the refreshed signing workflow')
    })
    response = ready()
    await act(async () => { await result.refresh('s1', 'source') })
    assert.deepEqual((await pending).actions, response.data)
})

test('updates for another account cannot continue the old execution, and cancellation releases its wait', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    await render()
    const scope = new AbortController()
    let settled = false
    const pending = wait(scope.signal).finally(() => { settled = true })
    const cancelled = assert.rejects(pending, { name: 'AbortError' })
    response = ready()
    await render({ address: 'other-account' })
    assert.equal(container.textContent, 'publish')
    assert.equal(settled, false)
    act(() => scope.abort())
    await cancelled
})

test('a transition that stays pending times out independently of the polling loop', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    await render()
    let settled = false
    const pending = wait(new AbortController().signal).finally(() => { settled = true })
    const timedOut = assert.rejects(pending, /The transaction is still confirming/)
    response = waiting()
    await act(async () => { t.mock.timers.tick(139999) })
    assert.equal(settled, false)
    await act(async () => { t.mock.timers.tick(1) })
    await timedOut
    const before = requests.length
    await act(async () => { t.mock.timers.tick(2000) })
    assert.equal(requests.length, before + 1, 'timeout does not stop observing the swap')
})

for (const kind of ['action', 'api', 'network']) {
    test(`${kind} failures reject the transition without waiting for the deadline`, async t => {
        t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
        await render()
        const pending = assert.rejects(wait(new AbortController().signal), /Transition failed/)
        if (kind === 'action') response = { data: [{ ...sign, status: 'failed', detail: 'Transition failed' }] }
        if (kind === 'api') response = { error: new Error('Transition failed') }
        if (kind === 'network') failure = new Error('Transition failed')
        for (let i = 0; i < 2; i++) await act(async () => { t.mock.timers.tick(2000) })
        await pending
    })
}

test('a completed workflow resolves without another request', async () => {
    response = { data: [{ ...sign, status: 'completed' }, { ...publish, status: 'completed' }] }
    await render()
    assert.deepEqual((await wait(new AbortController().signal)).actions, response.data)
    assert.equal(requests.length, 1)
})

test('completed signing alone keeps waiting until a late publish action arrives', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    response = { data: [sign] }
    await render()
    let settled = false
    const pending = wait(new AbortController().signal).then(value => { settled = true; return value })
    response = { data: [{ step: 'sign', status: 'completed' }] }
    for (let i = 0; i < 3; i++) await act(async () => { t.mock.timers.tick(2000) })
    assert.equal(settled, false, 'completed signing is not a submitted deposit')
    assert.ok(requests.includes('/swaps/s1/authorize'), 'ambiguous signing observes authoritative submission status')
    response = ready()
    await act(async () => { t.mock.timers.tick(2000) })
    assert.deepEqual(await pending, { actions: response.data })
})

for (const status of ['published', 'completed']) {
    test(`a sign-only workflow can finish when authorization is ${status}`, async t => {
        t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
        response = { data: [{ step: 'sign', status: 'completed' }] }
        await render()
        let settled = false
        const pending = wait(new AbortController().signal).then(value => { settled = true; return value })
        await act(async () => { t.mock.timers.tick(4000) })
        assert.equal(settled, false, 'initiated authorization is not submission')
        authorization = { data: { status, transaction: { transaction_hash: '0xrelayed', status: 'pending' } } }
        await act(async () => { t.mock.timers.tick(2000) })
        assert.deepEqual(await pending, { actions: response.data, authorization: authorization.data })
    })
}

test('explicit self-paid signing waits for publication without polling gasless status', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    const prerequisite = { ...sign, signing_standard: 'permit2_witness', status: 'completed' }
    response = { data: [prerequisite] }
    authorization = { data: { status: 'expired' } }
    await render()
    let settled = false
    const pending = wait(new AbortController().signal).then(value => { settled = true; return value })
    for (let i = 0; i < 3; i++) await act(async () => { t.mock.timers.tick(2000) })
    assert.equal(settled, false)
    assert.ok(requests.every(key => !key.endsWith('/authorize')))
    response = { data: [prerequisite, { ...publish, status: 'action_required' }] }
    await act(async () => { t.mock.timers.tick(2000) })
    assert.deepEqual(await pending, { actions: response.data })
})

for (const status of ['expired', 'insufficient', 'rejected']) {
    test(`an ${status} authorization cannot complete a sign-only workflow`, async () => {
        response = { data: [{ step: 'sign', status: 'completed' }] }
        authorization = { data: { status } }
        await render()
        let rejected
        await act(async () => { rejected = assert.rejects(wait(new AbortController().signal), /The swap authorization failed/) })
        await rejected
    })
}

test('a completed approval alone cannot finish the deposit', async () => {
    response = { data: [{ step: 'approve_permit2', status: 'completed' }] }
    await render()
    const scope = new AbortController()
    let settled = false
    const pending = wait(scope.signal, { previousAction: { step: 'approve_permit2', status: 'action_required' } }).finally(() => { settled = true })
    const cancelled = assert.rejects(pending, { name: 'AbortError' })
    await Promise.resolve()
    assert.equal(settled, false)
    act(() => scope.abort())
    await cancelled
})

test('an unavailable authorization lookup does not strand late publication', async () => {
    response = { data: [{ step: 'sign', status: 'completed' }] }
    authorization = { error: { message: 'Authorization status is unavailable' } }
    await render()
    let pending
    await act(async () => { pending = wait(new AbortController().signal) })
    response = ready()
    await act(async () => { await result.refresh('s1', 'source') })
    assert.deepEqual(await pending, { actions: response.data })
})

test('a failed authorization transaction cannot complete the deposit', async () => {
    response = { data: [{ step: 'sign', status: 'completed' }] }
    authorization = { data: { status: 'published', transaction: { transaction_hash: '0xfailed', status: 'failed' } } }
    await render()
    let rejected
    await act(async () => { rejected = assert.rejects(wait(new AbortController().signal), /The swap authorization failed/) })
    await rejected
})
