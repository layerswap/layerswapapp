import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import React, { act, createElement, Fragment } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'

const require = createRequire(import.meta.url)
const walletPath = '../src/components/Pages/Swap/Withdraw/Wallet/Common/'

function loadSource(path, imports = {}) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(name => {
        if (name === 'react/jsx-runtime') return require(name)
        if (name in imports) return imports[name]
        throw new Error(`Unexpected dependency: ${name}`)
    }, module, module.exports)
    return module.exports
}

const walletTypes = loadSource('../../types/src/actionMessage.ts')
const walletErrors = loadSource('../../../wallets/core/src/lib/walletErrors.ts', { '@layerswap/widget-types': walletTypes })
const rejection = loadSource(`${walletPath}isUserRejection.ts`, { '@layerswap/wallet-core/errors': walletErrors })
const gasless = loadSource('../src/helpers/gasless.ts')
const depositActions = loadSource('../src/helpers/depositActions.ts')
const progressTypes = loadSource('../src/components/Pages/Swap/Withdraw/Processing/types.ts')
const noop = () => {}
const sourceAddress = '0x123'
const swapId = 'existing-swap'
const cacheKey = `/swaps/${swapId}/deposit_actions?source_address=${sourceAddress}`
const actionsFor = nonce => [
    { type: 'sign', step: 'sign', status: 'action_required', typed_data: { message: { nonce } } },
    { type: 'transfer', step: 'publish', status: 'waiting', amount: '1', to_address: '0x456' },
]

function createWorkflow({ mounted = false } = {}) {
    let view
    const calls = { refresh: [], sign: [], authorize: [], transfer: [], storedTransactions: [], authorizations: [], errors: [], lifecycle: [], success: 0 }
    const state = {
        apiActions: actionsFor('fresh'),
        refreshError: undefined,
        rejectSigning: true,
        rejected: false,
        swapId,
        swapDetails: { id: swapId, metadata: {} },
        depositActionsResponse: actionsFor('expired'),
        onWalletPrompt: undefined,
        onTransition: undefined,
        completedStep: undefined,
        setSwapError(value) { state.swapError = value },
    }
    const preferences = { gaslessEnabled: false, gaslessUnavailable: false }
    const store = value => Object.assign(selector => selector(value), { getState: () => value })
    const stores = {
        useGaslessAuthorizationStore: store({
            authorizations: {},
            setGaslessAuthorization(id, validBefore) { this.authorizations[id] = { validBefore }; calls.authorizations.push([id, validBefore]) },
            setGaslessAuthorizationStatus: (...args) => calls.authorizations.push(args),
        }),
        useSwapTransactionStore: store({ swapTransactions: {}, setSwapTransaction: (...args) => calls.storedTransactions.push(args) }),
    }
    const preferenceStore = { useGaslessPreferenceStore: store(preferences) }
    const network = { name: 'BASE_MAINNET' }
    const wallet = { id: 'wallet', address: sourceAddress, isActive: true, asSourceSupportedNetworks: [network.name] }
    const cache = new Map([[cacheKey, { data: state.depositActionsResponse }]])
    let pollingKey
    const api = {
        fetcher: async () => ({ data: state.apiActions }),
        GetDepositActionsAsync: async (...args) => {
            calls.refresh.push(args)
            return state.refreshError ? { error: state.refreshError } : { data: state.apiActions }
        },
        AuthorizeSwapAsync: async (...args) => { calls.authorize.push(args) },
        GetSwapAsync: () => assert.fail('Workflow execution must not poll whole swaps'),
        SwapCatchup: async () => {},
    }
    const apiModule = { default: class { constructor() { return api } }, BackendTransactionStatus: { Pending: 'pending' } }
    const lifecycle = { lifecycleContextFromSwap: () => ({}), lifecycleErrorDetails: () => ({}) }
    const { executeWalletOperation } = loadSource(`${walletPath}executeWalletOperation.ts`, {
        '@/lib/swapLifecycle': lifecycle, './isUserRejection': rejection,
    })
    const execution = loadSource(`${walletPath}depositExecution.ts`, {
        '@layerswap/widget-types': walletTypes,
        '@/lib/apiClients/layerSwapApiClient': apiModule,
        '@/stores/swapTransactionStore': stores,
        '@/stores/gaslessPreferenceStore': preferenceStore,
        './isUserRejection': rejection,
        '@/helpers/depositActions': depositActions,
        '@/helpers/gasless': gasless,
        '@/lib/swapLifecycle': lifecycle,
        '@/lib/widgetTelemetry': { widgetTelemetry: { beginOperation: () => () => {} } },
        './executeWalletOperation': { executeWalletOperation },
        '@/lib/ErrorHandler': { ErrorHandler: error => calls.errors.push(error) },
    })

    // Preserve component state across explicit renders; external wallet/API/SWR
    // boundaries stay controlled so an expired-payload retry is deterministic.
    const hooks = []
    let hookIndex = 0
    const useState = initial => {
        const index = hookIndex++
        if (!(index in hooks)) hooks[index] = initial
        return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value }]
    }
    const Steps = () => null
    const workflowView = loadSource('../src/components/Pages/Swap/Withdraw/Presentation/DepositWorkflowView.tsx', {
        '@/helpers/depositActions': depositActions,
        '../Processing/StepsComponent': {
            default: Steps,
            StepsPanel: ({ children }) => createElement(Fragment, null, children),
        },
        '../Processing/StepTransactionLink': { StepTransactionLink: noop },
        '@/components/utils/RoundDecimals': { truncateDecimals: value => value },
        './TransferStatusHeader': { TransferStatusHeader: noop },
        '../Processing/types': progressTypes,
    })
    const walletViews = loadSource('../src/components/Pages/Swap/Withdraw/Presentation/WalletActionsView.tsx', {
        '@/components/Buttons/submitButton': { default: noop },
        '@/components/Icons/FailIcon': { default: noop },
        '@/components/Icons/InfoIcon': { default: noop },
        '@/helpers/depositActions': depositActions,
        './DepositWorkflowView': workflowView,
        './WalletExecutionTransition': {
            WalletExecutionTransition: ({ workflow, controls }) =>
                createElement(Fragment, null, workflow, controls),
        },
        '@layerswap/ui-kit/components': { WalletIcon: noop },
        'lucide-react': { Loader2: noop },
        '../../Form/SecondaryComponents/validationError/constants': {},
        '../../Form/SecondaryComponents/validationError/ErrorDismissButton': { default: noop },
        '../../Form/SecondaryComponents/validationError/ErrorDisplay': { ErrorDisplay: noop },
        '../messages/Message': { default: noop },
    })
    const useFakeLayoutEffect = callback => {
        const [scope] = useState({ initialized: false })
        if (!scope.initialized) { callback(); scope.initialized = true }
    }
    const { SendTransactionButton, ButtonWrapper } = loadSource(`${walletPath}buttons.tsx`, {
        '@/helpers/depositActions': depositActions,
        '@/context/callbackProvider': { useCallbacks: () => ({ onSwapLifecycle: event => calls.lifecycle.push(event) }) },
        '@/lib/swapLifecycle': lifecycle,
        '@/hooks/useTransferBlocked': { useTransferBlocked: noop },
        '@/hooks/useClientLayoutEffect': { useClientLayoutEffect: mounted ? React.useLayoutEffect : useFakeLayoutEffect },
        // Script the hook's snapshots for execution tests. Its SWR requests,
        // timers, cache subscription and cancellation are covered in the polling integration tests.
        '@/hooks/useDepositActionPolling': {
            depositActionsKey: (id, address) => `/swaps/${id}/deposit_actions?source_address=${address}`,
            useDepositActionPolling: (id, address) => {
                pollingKey = id && address ? `/swaps/${id}/deposit_actions?source_address=${address}` : null
                return {
                    data: cache.get(pollingKey)?.data,
                    refresh: async (id, address) => {
                        const response = await api.GetDepositActionsAsync(id, address)
                        if (response.error) throw response.error
                        if (!response.data?.length) throw new Error('No deposit actions')
                        cache.set(`/swaps/${id}/deposit_actions?source_address=${address}`, response)
                        return response.data
                    },
                    waitForTransition: async ({ swapId: id, sourceAddress: address, previousAction, signal }) => {
                        signal.throwIfAborted()
                        const nextActions = await state.onTransition?.(previousAction.step)
                        const completedIndex = state.apiActions.findIndex(action => action.step === previousAction.step)
                        state.apiActions = nextActions ?? state.apiActions.map((action, index) => ({
                            ...action, status: index <= completedIndex ? 'completed' : index === completedIndex + 1 ? 'action_required' : 'waiting',
                        }))
                        signal.throwIfAborted()
                        cache.set(`/swaps/${id}/deposit_actions?source_address=${address}`, { data: state.apiActions })
                        return { actions: state.apiActions, authorization: state.authorization }
                    },
                }
            },
        },
        react: mounted ? React : { useState, useRef: initial => useState({ current: initial })[0], useMemo: fn => fn(), useCallback: fn => fn },
        '@layerswap/ui-kit/components': { WalletIcon: noop },
        '@/components/Buttons/submitButton': { default: noop },
        '@/hooks/useWallet': { default: () => ({ wallets: [wallet] }) },
        '@/context/swap': {
            useSwapDataState: () => state,
            useSwapDataUpdate: () => ({
                createSwap: (...args) => state.createSwap ? state.createSwap(...args) : assert.fail('Retry must keep the existing swap'),
                startFreshSwapAttempt: noop,
                mutateSwap: async () => {},
                setSwapId: id => { state.swapId = id },
            }),
        },
        'lucide-react': { Loader2: noop },
        '@/components/Pages/Swap/Form/SecondaryComponents/validationError/ErrorDisplay': { ErrorDisplay: noop },
        '@/components/Pages/Swap/Form/SecondaryComponents/validationError/ErrorDismissButton': { default: noop },
        '@/components/Icons/FailIcon': { default: noop },
        '../../messages/Message': { default: noop },
        '@/components/Wallet/WalletModal': { useConnectModal: noop },
        '@/context/settings': { useInitialSettings: () => ({}), useSettingsState: () => ({ networks: [network] }) },
        '@/stores/swapTransactionStore': stores,
        '@/stores/gaslessPreferenceStore': preferenceStore,
        '@/lib/apiClients/layerSwapApiClient': apiModule,
        '@layerswap/utils': { sleep: async () => {} },
        '@/components/utils/numbers': { isDiffByPercent: () => false },
        '@/context/withdrawalContext': { useWalletWithdrawalState: () => ({ onWalletWithdrawalSuccess: () => calls.success++ }) },
        '@/context/swapAccounts': { useSelectedAccount: () => ({ id: wallet.id, address: wallet.address }) },
        '@/lib/ErrorHandler': { ErrorHandler: error => calls.errors.push(error) },
        '@/lib/fees': { resolvePriceImpactValues: noop },
        '@/components/Icons/InfoIcon': { default: noop },
        '@/components/Pages/Swap/Form/SecondaryComponents/validationError/constants': {},
        '@/lib/balances/useBalance': { useBalance: () => ({}) },
        '@/lib/gases/useSWRGas': { default: () => ({}) },
        '@/context/depositSettings': { useDepositSettings: () => ({}) },
        './depositExecution': execution,
        '../../Presentation/WalletActionsView': mounted ? { ...walletViews, SendTransactionView: props => { view = props; return null } } : walletViews,
        '../../Processing/StepsComponent': { default: Steps },
        '../../Processing/types': progressTypes,
        '@/helpers/swapProgress': { hasSwapExecutionProgress: () => false },
        '@/helpers/gasless': gasless,
        './isUserRejection': rejection,
        swr: {
            useSWRConfig: () => ({ mutate: async (key, result) => { const data = await result; cache.set(key, data); return data } }),
        },
    })
    const findElement = (node, type) => {
        if (!node || typeof node !== 'object') return undefined
        if (node.type === type) return node
        if (typeof node.type === 'function') return findElement(node.type(node.props), type)
        for (const child of [node.props?.children].flat()) {
            const match = findElement(child, type)
            if (match) return match
        }
    }
    const props = () => ({
            swapData: { source_network: network, source_token: {}, requested_amount: '1' },
            refuel: false,
            error: state.rejected,
            clearError: () => { state.rejected = false },
            onSign: async action => {
                calls.sign.push(action.typed_data.message.nonce)
                await state.onWalletPrompt?.('sign')
                if (state.rejectSigning) {
                    state.rejected = true
                    throw { code: 4001 }
                }
                state.completedStep = 'sign'
                return 'fresh-signature'
            },
            onClick: async props => {
                calls.transfer.push(props)
                const step = depositActions.getActionableDepositAction(state.apiActions).step
                await state.onWalletPrompt?.(step)
                state.completedStep = step
                return step === 'approve_permit2' ? '0xapproval' : '0xtransaction'
            },
        })
    const render = () => {
        hookIndex = 0
        const tree = SendTransactionButton(props())
        return { button: findElement(tree, ButtonWrapper), steps: findElement(tree, Steps)?.props.steps }
    }
    return {
        state, calls, render, wallet,
        Component: () => createElement(SendTransactionButton, props()),
        get view() { return view },
        poll: async () => {
            assert.ok(pollingKey, 'Polling remains enabled after rejection')
            cache.set(pollingKey, await api.fetcher(pollingKey))
        },
    }
}

test('one click runs approval, signing and publication without intermediate action buttons', async () => {
    const flow = createWorkflow()
    flow.state.apiActions = [
        { type: 'transfer', step: 'approve_permit2', status: 'action_required', amount: '0', to_address: '0x456' },
        ...actionsFor('fresh').map(action => ({ ...action, status: 'waiting' })),
    ]
    flow.state.rejectSigning = false
    const prompts = []
    const transitions = []
    flow.state.onWalletPrompt = step => {
        prompts.push(step)
        const { button, steps } = flow.render()
        assert.equal(button, undefined, `${step}: wallet prompt does not require another click`)
        const current = steps.findIndex(item => item.status === 'current')
        assert.equal(current, prompts.length - 1)
        assert.equal(steps[current].isLoading, true)
        assert.ok(steps.slice(0, current).every(item => item.status === 'complete'))
        assert.deepEqual(flow.calls.storedTransactions, [], 'prerequisites are not recorded as swap deposits')
        assert.ok(flow.calls.lifecycle.every(event => !['transaction_submitted', 'gasless_authorization_submitted'].includes(event.step)), 'prerequisites never report a submitted deposit')
    }
    flow.state.onTransition = step => {
        transitions.push(step)
        const { button, steps } = flow.render()
        assert.equal(button, undefined, `${step}: refreshing the workflow never exposes an action button`)
        assert.ok(steps.some(item => item.isLoading))
    }

    await flow.render().button.props.onClick()

    assert.deepEqual(prompts, ['approve_permit2', 'sign', 'publish'])
    assert.deepEqual(transitions, ['approve_permit2', 'sign'])
    assert.deepEqual(flow.calls.storedTransactions, [[swapId, 'pending', '0xtransaction']])
    assert.equal(flow.calls.success, 1)
    assert.deepEqual(flow.calls.errors, [])
    assert.deepEqual(flow.calls.lifecycle.filter(event => event.step.endsWith('_submitted')).map(event => [event.step, event.transactionHash]), [['transaction_submitted', '0xtransaction']])
})

test('a swap created with only approval discovers and executes signing and publication', async () => {
    const flow = createWorkflow()
    const approval = { type: 'transfer', step: 'approve_permit2', status: 'action_required', amount: '0', to_address: '0x456' }
    flow.state.swapId = undefined
    flow.state.swapDetails = undefined
    flow.state.apiActions = [approval]
    flow.state.rejectSigning = false
    flow.state.createSwap = async () => ({
        swap: { id: swapId, metadata: {} },
        deposit_actions: [approval],
        quote: { receive_amount: 1 },
    })
    const prompts = []
    const transitions = []
    flow.state.onWalletPrompt = step => { prompts.push(step) }
    flow.state.onTransition = step => {
        transitions.push(step)
        if (step === 'approve_permit2') {
            return [{ ...approval, status: 'completed' }, ...actionsFor('revealed-after-approval')]
        }
    }

    await flow.render().button.props.onClick()

    assert.deepEqual(prompts, ['approve_permit2', 'sign', 'publish'])
    assert.deepEqual(transitions, ['approve_permit2', 'sign'])
    assert.deepEqual(flow.calls.storedTransactions, [[swapId, 'pending', '0xtransaction']])
    assert.equal(flow.calls.success, 1)
    assert.deepEqual(flow.calls.errors, [])
})

for (const completes of [false, true]) {
    test(`repeated workflow transitions ${completes ? 'can complete at' : 'stop at'} the safety bound`, async () => {
        const flow = createWorkflow()
        const approvalActions = [
            { type: 'transfer', step: 'approve_permit2', status: 'action_required', amount: '0', to_address: '0x456' },
            ...actionsFor('repeated').map(action => ({ ...action, status: 'waiting' })),
        ]
        flow.state.apiActions = approvalActions
        flow.state.rejectSigning = false
        let transitions = 0
        flow.state.onTransition = step => {
            transitions++
            if (completes && transitions === 10) {
                return flow.state.apiActions.map(action => ({ ...action, status: 'completed' }))
            }
            assert.ok(transitions <= 10, 'repeated transitions must not request unbounded wallet actions')
            return step === 'approve_permit2' ? actionsFor('repeated') : approvalActions
        }

        await flow.render().button.props.onClick()

        assert.equal(flow.calls.transfer.length + flow.calls.sign.length, 10)
        assert.equal(transitions, 10)
        assert.deepEqual(flow.calls.storedTransactions, [])
        assert.equal(flow.calls.success, completes ? 1 : 0)
        assert.deepEqual(flow.calls.errors.map(error => error.message), completes ? [] : ['The swap workflow has more actions than expected'])
    })
}

test('rejected signing retries on the same swap using refreshed typed data', async () => {
    const flow = createWorkflow()
    await flow.render().button.props.onClick()
    assert.deepEqual(flow.calls.sign, ['fresh'])
    assert.equal(flow.state.rejected, true)

    flow.state.apiActions = actionsFor('renewed-after-waiting')
    flow.state.rejectSigning = false
    await flow.render().button.props.onClick()

    assert.deepEqual(flow.calls.sign, ['fresh', 'renewed-after-waiting'])
    assert.deepEqual(flow.calls.refresh, [[swapId, sourceAddress], [swapId, sourceAddress]])
    assert.deepEqual(flow.calls.authorize, [[swapId, 'fresh-signature', sourceAddress]])
    assert.equal(flow.calls.transfer[0].swapId, swapId)
    assert.equal(flow.calls.success, 1)
    assert.deepEqual(flow.calls.errors, [])
})

test('polling continues after rejection and newer actions override the local workflow snapshot', async () => {
    const flow = createWorkflow()
    await flow.render().button.props.onClick()
    const rejected = flow.render()
    assert.equal(rejected.steps[0].status, 'failed')

    flow.state.apiActions = flow.state.apiActions.map(action => ({
        ...action, status: action.step === 'sign' ? 'completed' : 'action_required',
    }))
    await flow.poll()
    const updated = flow.render()
    assert.equal(updated.steps[0].status, 'complete')
    assert.equal(flow.calls.sign.length, 1, 'Background refresh never opens a wallet prompt')
})

test('a failed or empty refresh never falls back to signing an expired cached action', async () => {
    for (const response of ['error', 'empty']) {
        const flow = createWorkflow()
        flow.state.rejected = true
        if (response === 'error') flow.state.refreshError = { message: 'Refresh unavailable' }
        else flow.state.apiActions = []
        await flow.render().button.props.onClick()
        assert.deepEqual(flow.calls.sign, [])
        assert.deepEqual(flow.calls.authorize, [])
        assert.equal(flow.calls.errors.length, 1)
        assert.equal(flow.state.swapId, swapId)
    }
})


for (const stop of ['unmount', 'reopen', 'account change']) {
    test(`approval confirmation cannot continue after ${stop}`, async () => {
        const dom = new JSDOM('<div id="root"></div>')
        const previous = Object.getOwnPropertyDescriptors(globalThis)
        Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
        const flow = createWorkflow({ mounted: true })
        flow.state.apiActions = [
            { type: 'transfer', step: 'approve_permit2', status: 'action_required', amount: '0', to_address: '0x456' },
            ...actionsFor('fresh').map(action => ({ ...action, status: 'waiting' })),
        ]
        flow.state.rejectSigning = false
        const confirmation = Promise.withResolvers()
        flow.state.onTransition = () => confirmation.promise
        const root = createRoot(document.getElementById('root'))
        let pending
        let unmounted = false
        try {
            await act(async () => root.render(createElement(flow.Component)))
            await act(async () => { pending = flow.view.handleClick() })
            assert.equal(flow.calls.transfer.length, 1)
            assert.deepEqual(flow.calls.sign, [])
            if (stop === 'unmount') {
                await act(async () => root.unmount())
                unmounted = true
            } else if (stop === 'reopen') {
                await act(async () => root.render(null))
                await act(async () => root.render(createElement(flow.Component)))
            } else {
                flow.wallet.address = '0xother'
                await act(async () => root.render(createElement(flow.Component)))
            }
            await act(async () => { confirmation.resolve(); await pending })
            assert.deepEqual(flow.calls.sign, [], 'cancelled approval cannot request a signature')
            assert.equal(flow.calls.transfer.length, 1, 'cancelled workflow cannot publish')
            assert.deepEqual(flow.calls.authorize, [])
            assert.deepEqual(flow.calls.storedTransactions, [])
            assert.deepEqual(flow.calls.errors, [])
            if (!unmounted) assert.equal(flow.view.loading, false, 'the active controller can retry')
            if (stop === 'reopen') {
                await act(async () => flow.view.handleClick())
                assert.equal(flow.calls.sign.length, 1, 'only the reopened controller requests a signature')
                assert.equal(flow.calls.transfer.length, 2, 'publication is requested once')
                assert.equal(flow.calls.success, 1)
            }
        } finally {
            confirmation.resolve()
            if (pending) await act(async () => pending)
            if (!unmounted) await act(async () => root.unmount())
            dom.window.close()
            for (const key of ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']) {
                if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
                else delete globalThis[key]
            }
        }
    })
}

test('closing while publication is in flight retains the submitted transaction without a stale UI callback', async () => {
    const dom = new JSDOM('<div id="root"></div>')
    const previous = Object.getOwnPropertyDescriptors(globalThis)
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
    const flow = createWorkflow({ mounted: true })
    flow.state.apiActions = [{ type: 'transfer', step: 'publish', status: 'action_required', amount: '1', to_address: '0x456' }]
    const publication = Promise.withResolvers()
    flow.state.onWalletPrompt = () => publication.promise
    const root = createRoot(document.getElementById('root'))
    let pending
    try {
        await act(async () => root.render(createElement(flow.Component)))
        await act(async () => { pending = flow.view.handleClick() })
        assert.equal(flow.calls.transfer.length, 1)
        await act(async () => root.unmount())
        publication.resolve()
        await pending
        assert.deepEqual(flow.calls.storedTransactions, [[swapId, 'pending', '0xtransaction']])
        assert.equal(flow.calls.success, 0, 'a closed form is not updated by the old controller')
        assert.deepEqual(flow.calls.errors, [])
    } finally {
        publication.resolve()
        if (pending) await pending
        dom.window.close()
        for (const key of ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']) {
            if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
            else delete globalThis[key]
        }
    }
})

for (const resuming of [false, true]) {
    test(`${resuming ? 'resuming a completed sign' : 'a sign-only initial response'} waits for and sends late publication`, async () => {
        const flow = createWorkflow()
        const [sign, publish] = actionsFor('late-publish')
        flow.state.apiActions = [{ ...sign, status: resuming ? 'completed' : 'action_required' }]
        flow.state.rejectSigning = false
        const transitions = []
        flow.state.onTransition = step => {
            transitions.push(step)
            assert.equal(flow.calls.success, 0, 'signing does not hand off to processing')
            assert.deepEqual(flow.calls.storedTransactions, [])
            assert.equal(flow.calls.authorizations.length, resuming ? 0 : 1, 'the signature is retained without a transaction marker')
            assert.ok(flow.calls.lifecycle.every(event => !event.step.endsWith('_submitted')))
            return [{ ...sign, status: 'completed' }, { ...publish, status: 'action_required' }]
        }
        await flow.render().button.props.onClick()
        assert.deepEqual(transitions, ['sign'])
        assert.deepEqual(flow.calls.sign, resuming ? [] : ['late-publish'])
        assert.deepEqual(flow.calls.storedTransactions, [[swapId, 'pending', '0xtransaction']])
        assert.equal(flow.calls.transfer.length, 1)
        assert.equal(flow.calls.success, 1)
        assert.deepEqual(flow.calls.errors, [])
    })
}

test('gasless execution records success only after a confirmed server submission', async () => {
    const flow = createWorkflow()
    const [sign] = actionsFor('gasless')
    flow.state.apiActions = [{ ...sign, valid_before: 12345 }]
    flow.state.rejectSigning = false
    flow.state.onTransition = () => {
        assert.equal(flow.calls.success, 0)
        assert.deepEqual(flow.calls.storedTransactions, [])
        assert.deepEqual(flow.calls.authorizations, [[swapId, 12345]])
        flow.state.authorization = { status: 'published', transaction: { transaction_hash: '0xrelayed', status: 'pending' } }
        return [{ ...sign, status: 'completed' }]
    }
    await flow.render().button.props.onClick()
    assert.deepEqual(flow.calls.storedTransactions, [[swapId, 'pending', '0xrelayed']])
    assert.deepEqual(flow.calls.authorizations, [[swapId, 12345], [swapId, 'published', flow.state.authorization.transaction]])
    assert.equal(flow.calls.transfer.length, 0)
    assert.equal(flow.calls.success, 1)
    assert.equal(flow.calls.lifecycle.at(-1).step, 'gasless_authorization_submitted')
    assert.deepEqual(flow.calls.errors, [])
})

for (const status of ['expired', 'insufficient', 'rejected']) {
    test(`a completed sign with ${status} authorization keeps its retry button enabled`, async () => {
        const flow = createWorkflow()
        const [sign] = actionsFor('failed-authorization')
        flow.state.apiActions = [sign]
        flow.state.rejectSigning = false
        flow.state.onTransition = () => {
            flow.state.apiActions = [{ step: 'sign', status: 'completed' }]
            throw new Error(`The swap authorization failed: ${status}`)
        }
        await flow.render().button.props.onClick()
        await flow.poll()
        const { button } = flow.render()
        assert.equal(button.props.children, 'Try again')
        assert.equal(button.props.isDisabled, false)
        assert.equal(flow.calls.success, 0)
        assert.deepEqual(flow.calls.storedTransactions, [])
    })
}

test('completed prerequisites allow resuming a late publish action', async () => {
    const flow = createWorkflow()
    flow.render()
    flow.state.apiActions = [
        { step: 'approve_permit2', status: 'completed' },
        { step: 'sign', status: 'completed' },
    ]
    await flow.poll()
    const { button } = flow.render()
    assert.equal(button.props.isDisabled, false)
    assert.notEqual(button.props.children, 'Completed')
    flow.state.onTransition = () => [
        ...flow.state.apiActions,
        { type: 'transfer', step: 'publish', status: 'action_required', amount: '1', to_address: '0x456' },
    ]
    await button.props.onClick()
    assert.deepEqual(flow.calls.sign, [], 'resuming does not ask for another signature')
    assert.equal(flow.calls.transfer.length, 1)
    assert.equal(flow.calls.success, 1)
})

for (const step of ['publish', 'deposit']) {
    test(`a completed ${step} still disables the deposit button`, async () => {
        const flow = createWorkflow()
        flow.render()
        flow.state.apiActions = [{ step, status: 'completed' }]
        await flow.poll()
        const { button } = flow.render()
        assert.equal(button.props.isDisabled, true)
        assert.equal(button.props.children, 'Completed')
    })
}
