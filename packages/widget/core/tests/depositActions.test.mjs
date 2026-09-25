import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import { createElement, Fragment } from 'react'

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
const rejection = loadSource(`${walletPath}isUserRejection.ts`, { '@layerswap/widget-types': walletTypes })
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

function createWorkflow() {
    const calls = { refresh: [], sign: [], authorize: [], transfer: [], storedTransactions: [], errors: [], success: 0 }
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
        useGaslessAuthorizationStore: store({ authorizations: {} }),
        useSwapTransactionStore: store({ swapTransactions: {}, setSwapTransaction: (...args) => calls.storedTransactions.push(args) }),
    }
    const preferenceStore = { useGaslessPreferenceStore: store(preferences) }
    const network = { name: 'BASE_MAINNET' }
    const wallet = { id: 'wallet', address: sourceAddress, isActive: true, asSourceSupportedNetworks: [network.name] }
    const cache = new Map([[cacheKey, { data: state.depositActionsResponse }]])
    let swrRequest
    const api = {
        fetcher: async () => ({ data: state.apiActions }),
        GetDepositActionsAsync: async (...args) => {
            calls.refresh.push(args)
            return state.refreshError ? { error: state.refreshError } : { data: state.apiActions }
        },
        AuthorizeSwapAsync: async (...args) => { calls.authorize.push(args) },
        GetSwapAsync: async () => {
            state.onTransition?.(state.completedStep)
            const completedIndex = state.apiActions.findIndex(action => action.step === state.completedStep)
            state.apiActions = state.apiActions.map((action, index) => ({
                ...action, status: index <= completedIndex ? 'completed' : index === completedIndex + 1 ? 'action_required' : 'waiting',
            }))
            return { data: { deposit_actions: state.apiActions } }
        },
        SwapCatchup: async () => {},
    }
    const apiModule = { default: class { constructor() { return api } }, BackendTransactionStatus: { Pending: 'pending' } }
    const execution = loadSource(`${walletPath}depositExecution.ts`, {
        '@layerswap/widget-types': walletTypes,
        '@/lib/apiClients/layerSwapApiClient': apiModule,
        '@/stores/swapTransactionStore': stores,
        '@/stores/gaslessPreferenceStore': preferenceStore,
        './isUserRejection': rejection,
        '@/helpers/depositActions': depositActions,
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
    const { SendTransactionButton, ButtonWrapper } = loadSource(`${walletPath}buttons.tsx`, {
        react: { useState, useRef: initial => useState({ current: initial })[0], useMemo: fn => fn(), useCallback: fn => fn },
        '@layerswap/ui-kit/components': { WalletIcon: noop },
        '@/components/Buttons/submitButton': { default: noop },
        '@/hooks/useWallet': { default: () => ({ wallets: [wallet] }) },
        '@/context/swap': {
            useSwapDataState: () => state,
            useSwapDataUpdate: () => ({
                createSwap: () => assert.fail('Retry must keep the existing swap'),
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
        '@/context/swapAccounts': { useSelectedAccount: () => ({ id: wallet.id, address: sourceAddress }) },
        '@/lib/ErrorHandler': { ErrorHandler: error => calls.errors.push(error) },
        '@/lib/fees': { resolvePriceImpactValues: noop },
        '@/components/Icons/InfoIcon': { default: noop },
        '@/components/Pages/Swap/Form/SecondaryComponents/validationError/constants': {},
        '@/lib/balances/useBalance': { useBalance: () => ({}) },
        '@/lib/gases/useSWRGas': { default: () => ({}) },
        '@/context/depositSettings': { useDepositSettings: () => ({}) },
        './depositExecution': execution,
        '../../Presentation/WalletActionsView': walletViews,
        '../../Processing/StepsComponent': { default: Steps },
        '../../Processing/types': progressTypes,
        '@/helpers/swapProgress': { hasSwapExecutionProgress: () => false },
        '@/helpers/gasless': gasless,
        './isUserRejection': rejection,
        swr: {
            default: (key, fetcher, options) => { swrRequest = { key, fetcher, options }; return { data: cache.get(key) } },
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
    const render = () => {
        hookIndex = 0
        const tree = SendTransactionButton({
            swapData: { source_network: network, source_token: {}, requested_amount: '1' },
            refuel: false,
            error: state.rejected,
            clearError: () => { state.rejected = false },
            onSign: async action => {
                calls.sign.push(action.typed_data.message.nonce)
                state.onWalletPrompt?.('sign')
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
                state.onWalletPrompt?.(step)
                state.completedStep = step
                return step === 'approve_permit2' ? '0xapproval' : '0xtransaction'
            },
        })
        return { button: findElement(tree, ButtonWrapper), steps: findElement(tree, Steps)?.props.steps }
    }
    return {
        state, calls, render,
        poll: async () => {
            assert.ok(swrRequest.key, 'Polling remains enabled after rejection')
            assert.ok(swrRequest.options.refreshInterval > 0, 'Polling has a repeating interval')
            cache.set(swrRequest.key, await swrRequest.fetcher(swrRequest.key))
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
})

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
