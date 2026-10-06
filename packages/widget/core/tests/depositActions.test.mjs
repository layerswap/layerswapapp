import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import React, { act, createElement, Fragment } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { createSwapContext } from './helpers/swap-context.mjs'

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
const atomicActions = loadSource('../src/lib/atomicBatchActions.ts')
const atomicFixtures = JSON.parse(readFileSync(new URL('./fixtures/atomic-batch.json', import.meta.url)))
const swapProgress = loadSource('../src/helpers/swapProgress.ts', {
    './gasless': gasless,
    '@layerswap/widget-types': loadSource('../../types/src/SwapStatus.ts'),
    '@/lib/apiClients/layerSwapApiClient': {
        BackendTransactionStatus: { Failed: 'failed' }, TransactionType: { Input: 'input' },
    },
})
const progressTypes = loadSource('../src/components/Pages/Swap/Withdraw/Processing/types.ts')
const noop = () => {}
const sourceAddress = '0x123'
const swapId = 'existing-swap'
const cacheKey = `/swaps/${swapId}/deposit_actions?source_address=${sourceAddress}`
const actionsFor = nonce => [
    { type: 'sign', step: 'sign', status: 'action_required', typed_data: { message: { nonce } } },
    { type: 'transfer', step: 'publish', status: 'waiting', amount: '1', to_address: '0x456' },
]

function createWorkflow({ mounted = false, realPolling = false, atomic = false } = {}) {
    let view
    const calls = { refresh: [], confirmations: [], sign: [], authorize: [], transfer: [], batches: [], executionStarts: [], quoteLoading: [], sleeps: [], storedTransactions: [], authorizations: [], signatures: [], errors: [], lifecycle: [], success: 0 }
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
    const preferences = {
        gaslessEnabled: false, gaslessUnavailable: false,
        reportGaslessUnavailable(stage) { preferences.gaslessUnavailable = true; preferences.gaslessFailureStage = stage },
        switchToStandardTransfer() { preferences.gaslessEnabled = false; preferences.gaslessUnavailable = false },
        clearGaslessUnavailable() { preferences.gaslessUnavailable = false },
    }
    const store = value => Object.assign(selector => selector(value), { getState: () => value })
    const stores = {
        useDepositSignatureStore: store({
            signatures: {},
            setDepositSignature(id, validBefore) { this.signatures[id] = { validBefore }; calls.signatures.push([id, validBefore]) },
            removeDepositSignature(id) { delete this.signatures[id] },
        }),
        useGaslessAuthorizationStore: store({
            authorizations: {},
            setGaslessAuthorization(id, validBefore) { this.authorizations[id] = { kind: 'gasless', validBefore }; calls.authorizations.push([id, validBefore]) },
            setGaslessAuthorizationStatus: (...args) => calls.authorizations.push(args),
            removeGaslessAuthorization(id) { delete this.authorizations[id] },
        }),
        useSwapTransactionStore: store({
            swapTransactions: {}, setSwapTransaction(id, status, hash) { stores.useSwapTransactionStore.getState().swapTransactions[id] = { status, hash }; calls.storedTransactions.push([id, status, hash]) },
            stepTransactions: {},
            setStepTransaction(id, step, hash, explorerUrl) {
                const transactions = this.stepTransactions[id] ??= {}
                transactions[step] = { hash, explorerUrl, timestamp: Date.now() }
            },
            removeSwapTransaction(id) { delete this.swapTransactions[id] },
        }),
    }
    const preferenceStore = { useGaslessPreferenceStore: store(preferences) }
    const network = { name: 'BASE_MAINNET', transaction_explorer_template: 'https://base.example.invalid/tx/{0}' }
    const wallet = { id: 'wallet', address: sourceAddress, isActive: true, asSourceSupportedNetworks: [network.name] }
    const cache = new Map([[cacheKey, { data: state.depositActionsResponse }]])
    let pollingKey
    const api = {
        fetcher: async () => ({ data: state.apiActions }),
        GetTransactionStatus: async (network, hash) => {
            calls.confirmations.push({ network, hash })
            return { data: { status: state.receipts?.get(hash) ?? 'Pending' } }
        },
        GetDepositActionsAsync: async (...args) => {
            calls.refresh.push(args)
            return state.refreshError ? { error: state.refreshError } : { data: state.apiActions }
        },
        AuthorizeSwapAsync: async (...args) => { calls.authorize.push(args) },
        GetSwapAsync: () => assert.fail('Workflow execution must not poll whole swaps'),
        SwapCatchup: async () => {},
    }
    const apiModule = { default: class { constructor() { return api } }, BackendTransactionStatus: { Pending: 'pending' } }
    const swapContext = realPolling ? createSwapContext({
        Client: apiModule.default, getSwapId: () => state.swapId, getAccount: () => wallet, stores,
    }) : undefined
    const realPollingHook = realPolling ? loadSource('../src/hooks/useDepositActionPolling.ts', {
        react: React,
        swr: require('swr'),
        '@/lib/apiClients/layerSwapApiClient': apiModule,
        '@/helpers/depositActions': depositActions,
        '@/helpers/gasless': gasless,
        '@/stores/swapTransactionStore': stores,
        '@/context/swap': swapContext,
        './useClientLayoutEffect': { useClientLayoutEffect: React.useLayoutEffect },
    }) : undefined
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
        '@/lib/address/explorerUrl': loadSource('../src/lib/address/explorerUrl.ts'),
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
    const ErrorDisplay = () => null
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
        '../../Form/SecondaryComponents/validationError/ErrorDisplay': { ErrorDisplay },
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
        '@/hooks/useDepositActionPolling': realPollingHook ?? {
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
                    waitForTransition: async ({ swapId: id, sourceAddress: address, previousAction, approvalTransaction, signal }) => {
                        signal.throwIfAborted()
                        if (approvalTransaction) calls.confirmations.push(approvalTransaction)
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
                setQuoteLoading: value => calls.quoteLoading.push(value),
                markWalletExecutionStarted: id => calls.executionStarts.push(id),
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
        '@layerswap/utils': { sleep: async duration => { calls.sleeps.push(duration); await state.onQuoteUpdate?.() } },
        '@/components/utils/numbers': { isDiffByPercent: () => state.quoteChanged ?? false },
        '@/context/withdrawalContext': { useWalletWithdrawalState: () => ({ onWalletWithdrawalSuccess: () => calls.success++ }) },
        '@/context/swapAccounts': { useSelectedAccount: () => ({ id: wallet.id, address: wallet.address }) },
        '@/lib/ErrorHandler': { ErrorHandler: error => calls.errors.push(error) },
        '@/lib/fees': loadSource('../src/lib/fees.ts'),
        '@/components/Icons/InfoIcon': { default: noop },
        '@/components/Pages/Swap/Form/SecondaryComponents/validationError/constants': {},
        '@/lib/balances/useBalance': { useBalance: () => ({}) },
        '@/lib/gases/useSWRGas': { default: () => ({}) },
        '@/context/depositSettings': { useDepositSettings: () => ({}) },
        './depositExecution': execution,
        '../../Presentation/WalletActionsView': mounted ? { ...walletViews, SendTransactionView: props => { view = props; return null } } : walletViews,
        '../../Processing/StepsComponent': { default: Steps },
        '../../Processing/types': progressTypes,
        '@/helpers/swapProgress': swapProgress,
        '@/helpers/atomicBatch': { isAtomicBatchEligible: () => state.atomicBatchEligible ?? false },
        '@/stores/atomicBatchStore': { acquireWalletExecution: () => () => {}, getOutstandingBatch: noop },
        '@/lib/atomicBatchExecution': { executeAtomicBatch: async (ctx, action) => {
            if (!atomic) assert.fail('legacy workflow cannot execute a batch')
            calls.batches.push(action)
            ctx.setActionStateText(`${depositActions.getDepositActionLabel(action)} in your wallet`)
            await state.onWalletPrompt?.('approve_and_swap')
            if (state.batchError) throw state.batchError
        } },
        '@/lib/resolvers/resolverService': { resolverService: { getTransferResolver: () => ({ getAtomicBatchProvider: () => ({}) }) } },
        '@/helpers/gasless': gasless,
        './isUserRejection': rejection,
        swr: realPolling ? require('swr') : {
            useSWRConfig: () => ({ mutate: async (key, result) => { const data = await result; cache.set(key, data); return data } }),
        },
    })
    const findElement = (node, type, predicate = () => true) => {
        if (!node || typeof node !== 'object') return undefined
        if (node.type === type && predicate(node)) return node
        if (typeof node.type === 'function') return findElement(node.type(node.props), type, predicate)
        for (const child of [node.props?.children].flat()) {
            const match = findElement(child, type, predicate)
            if (match) return match
        }
    }
    const props = () => ({
            swapData: { source_network: network, source_token: state.sourceToken ?? {}, requested_amount: '1', ...state.swapBasicData },
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
                return step === 'approve_permit2' ? state.approvalHash ?? '0xapproval' : '0xtransaction'
            },
        })
    const render = () => {
        hookIndex = 0
        const tree = SendTransactionButton(props())
        return {
            viewProps: tree.props,
            button: findElement(tree, ButtonWrapper), steps: findElement(tree, Steps)?.props.steps,
            buttonByText: label => findElement(tree, ButtonWrapper, node => node.props.children === label),
            warning: findElement(tree, ErrorDisplay)?.props.message,
        }
    }
    return {
        state, calls, render, wallet, preferences, stores, execution,
        Component: () => realPolling
            ? createElement(swapContext.SwapDataProvider, null, createElement(SendTransactionButton, props()))
            : createElement(SendTransactionButton, props()),
        get view() { return view },
        poll: async () => {
            assert.ok(pollingKey, 'Polling remains enabled after rejection')
            cache.set(pollingKey, await api.fetcher(pollingKey))
        },
    }
}

for (const name of ['zero_allowance', 'allowance_reset', 'sufficient_allowance']) test(`new backend ${name} executes one batch with no permit or ordinary transfer`, async () => {
    const flow = createWorkflow({ atomic: true })
    const actions = await atomicActions.resolveAtomicDepositActions(atomicFixtures.deposit_actions[name], async () => atomicFixtures.next_actions[name])
    flow.state.apiActions = actions
    flow.state.depositActionsResponse = actions
    flow.state.quote = { receive_amount: 1, destination_token: atomicFixtures.swap.destination_token }
    flow.render()
    await flow.poll()
    const rendered = flow.render()
    assert.equal(rendered.button.props.children, name === 'sufficient_allowance' ? 'Confirm swap' : 'Approve and swap')
    assert.equal(rendered.steps[0].name, name === 'sufficient_allowance' ? 'Confirm swap' : 'Approve and swap')
    assert.equal(rendered.viewProps.depositActions.length, 1)
    await rendered.button.props.onClick()
    assert.equal(flow.calls.batches.length, 1)
    assert.deepEqual(flow.calls.batches[0].calls, atomicFixtures.next_actions[name].action.calls)
    assert.deepEqual(flow.calls.transfer, [])
    assert.deepEqual(flow.calls.sign, [])
    assert.deepEqual(flow.calls.authorize, [])
    assert.deepEqual(flow.calls.storedTransactions, [], 'receipt polling supplies the hash later')
    assert.equal(flow.calls.success, 0)
    assert.deepEqual(flow.calls.errors, [])
})

test('new backend batch rejection never falls back to signing or an ordinary transfer', async () => {
    const flow = createWorkflow({ atomic: true })
    flow.state.apiActions = [atomicFixtures.actions.zero_allowance]
    flow.state.batchError = { code: 4001 }
    await flow.render().button.props.onClick()
    assert.equal(flow.calls.batches.length, 1)
    assert.deepEqual(flow.calls.transfer, [])
    assert.deepEqual(flow.calls.sign, [])
    assert.deepEqual(flow.calls.storedTransactions, [])
})

test('wallet capabilities alone never promise an approval before the server provides the calls', () => {
    const flow = createWorkflow()
    flow.state.swapId = undefined
    flow.state.swapDetails = undefined
    flow.state.depositActionsResponse = undefined
    flow.state.atomicBatchSupported = true
    flow.state.atomicBatchEligible = true
    assert.equal(flow.render().button.props.children, 'Swap now')
})

for (const route of ['same-network token swap', 'bridge', 'native token', 'manual deposit']) {
    test(`a single deposit transfer ${route === 'same-network token swap' ? 'keeps swap progress visible' : `keeps the existing ${route} presentation`}`, async () => {
        const flow = createWorkflow()
        const network = { name: 'BASE_MAINNET', type: 'evm' }
        flow.state.swapBasicData = {
            source_network: network,
            destination_network: route === 'bridge' ? { name: 'ARBITRUM_MAINNET', type: 'evm' } : network,
            source_token: route === 'native token' ? { symbol: 'ETH' } : { symbol: 'USDT', contract: atomicFixtures.token.contract },
            destination_token: { symbol: 'USDC', asset: 'USDC', decimals: 6 },
            use_deposit_address: route === 'manual deposit',
        }
        flow.state.quote = { receive_amount: 2.836322, destination_token: flow.state.swapBasicData.destination_token }
        flow.state.apiActions = [{ type: 'transfer', step: 'deposit', status: 'action_required', amount: '2.896498', to_address: '0x456' }]
        flow.render()
        await flow.poll()
        flow.state.onWalletPrompt = () => {
            const rendered = flow.render()
            if (route === 'same-network token swap') {
                assert.equal(rendered.button, undefined, 'the wallet prompt uses the progress panel')
                assert.deepEqual(rendered.steps.map(step => step.name), ['Send from wallet', 'Receive 2.836322 USDC'])
                assert.equal(rendered.steps[0].description, 'Confirm in your wallet')
                assert.equal(rendered.steps[0].isLoading, true)
            } else {
                assert.equal(rendered.steps, undefined)
                assert.equal(rendered.button.props.children, 'Confirm in your wallet')
            }
        }

        await flow.render().button.props.onClick()

        assert.equal(flow.calls.transfer.length, 1)
        assert.deepEqual(flow.calls.batches, [])
        assert.deepEqual(flow.calls.sign, [])
        assert.deepEqual(flow.calls.errors, [])
    })
}

for (const atomic of [true, false]) test(`a changed creation quote ${atomic ? 'enters atomic wallet progress directly' : 'keeps the legacy quote-update pause'}`, async () => {
    const flow = createWorkflow({ atomic })
    flow.state.swapId = undefined
    flow.state.swapDetails = undefined
    flow.state.quoteChanged = true
    flow.state.quote = { receive_amount: 100 }
    flow.state.apiActions = atomic ? [atomicFixtures.actions.zero_allowance]
        : [{ type: 'transfer', step: 'publish', status: 'action_required', amount: '1', to_address: '0x456' }]
    flow.state.createSwap = async () => ({
        swap: { id: 'changed-quote-swap', metadata: {} },
        quote: { receive_amount: 97 },
        deposit_actions: flow.state.apiActions,
    })
    flow.state.onQuoteUpdate = () => {
        assert.deepEqual(flow.calls.executionStarts, [])
        assert.equal(flow.render().viewProps.actionStateText, 'Updating quote…')
    }
    flow.state.onWalletPrompt = () => {
        assert.deepEqual(flow.calls.executionStarts, ['changed-quote-swap'], 'compact layout starts before the wallet prompt')
        if (atomic) assert.equal(flow.render().viewProps.actionStateText, 'Approve and swap in your wallet')
    }

    await flow.render().button.props.onClick()

    assert.deepEqual(flow.calls.sleeps, atomic ? [] : [3500])
    assert.deepEqual(flow.calls.quoteLoading, atomic ? [] : [true, false])
    assert.equal(flow.calls.batches.length, atomic ? 1 : 0)
    assert.equal(flow.calls.transfer.length, atomic ? 0 : 1)
    assert.deepEqual(flow.calls.sign, [])
    assert.deepEqual(flow.calls.errors, [])
})

test('raw atomic approval items cannot reach the ordinary transfer callback', async () => {
    const flow = createWorkflow()
    await assert.rejects(flow.execution.executeWalletTransfer({ depositActions: atomicFixtures.deposit_actions.zero_allowance },
        () => assert.fail('cannot open an ordinary transfer prompt'), atomicFixtures.deposit_actions.zero_allowance[0]), /Atomic approvals/)
})

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
        assert.deepEqual(flow.calls.executionStarts, [swapId], `${step}: compact layout starts before the first wallet prompt`)
        const { button, steps } = flow.render()
        assert.equal(button, undefined, `${step}: wallet prompt does not require another click`)
        const current = steps.findIndex(item => item.status === 'current')
        assert.equal(current, prompts.length - 1)
        assert.equal(steps[current].isLoading, true)
        assert.ok(steps.slice(0, current).every(item => item.status === 'complete'))
        assert.deepEqual(flow.calls.storedTransactions, [], 'prerequisites are not recorded as swap deposits')
        if (step !== 'approve_permit2') {
            assert.equal(steps[0].explorerUrl, 'https://base.example.invalid/tx/0xapproval', 'the approval link remains on its own step during signing and publication')
        }
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
    assert.equal(flow.stores.useSwapTransactionStore.getState().stepTransactions[swapId].approve_permit2.hash, '0xapproval')
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
    let resolveCreation
    flow.state.createSwap = () => new Promise(resolve => { resolveCreation = resolve })
    const created = {
        swap: { id: swapId, metadata: {} },
        deposit_actions: [approval],
        quote: { receive_amount: 1 },
    }
    const prompts = []
    const transitions = []
    flow.state.onWalletPrompt = step => {
        prompts.push(step)
        assert.deepEqual(flow.calls.executionStarts, [swapId])
    }
    flow.state.onTransition = step => {
        transitions.push(step)
        if (step === 'approve_permit2') {
            return [{ ...approval, status: 'completed' }, ...actionsFor('revealed-after-approval')]
        }
    }

    const execution = flow.render().button.props.onClick()
    assert.deepEqual(flow.calls.executionStarts, [], 'keep the full quote while preparing the swap')
    resolveCreation(created)
    await execution

    assert.deepEqual(prompts, ['approve_permit2', 'sign', 'publish'])
    assert.deepEqual(transitions, ['approve_permit2', 'sign'])
    assert.deepEqual(flow.calls.storedTransactions, [[swapId, 'pending', '0xtransaction']])
    assert.equal(flow.calls.success, 1)
    assert.deepEqual(flow.calls.errors, [])
})

for (const rejectRemainingApproval of [false, true]) {
    test(`a refreshed partial approval ${rejectRemainingApproval ? 'can be declined without advancing' : 'runs again before signing and publication'}`, async () => {
        const flow = createWorkflow()
        const approval = { type: 'transfer', step: 'approve_permit2', status: 'action_required', amount: 0,
            to_address: '0x456', call_data: '0xinitial' }
        const remainingApproval = { ...approval }
        flow.state.apiActions = [approval, ...actionsFor('fresh').map(action => ({ ...action, status: 'pending' }))]
        flow.state.rejectSigning = false
        let approvalPrompts = 0
        const prompts = []
        flow.state.onWalletPrompt = step => {
            prompts.push(step)
            if (step !== 'approve_permit2') return
            approvalPrompts++
            const { steps } = flow.render()
            assert.equal(steps[0].status, 'current', 'a submitted approval does not complete an actionable step')
            assert.ok(steps.slice(1).every(item => item.status === 'upcoming'))
            assert.deepEqual(flow.calls.storedTransactions, [], 'neither approval submits the swap')
            if (approvalPrompts === 2) {
                assert.equal(flow.calls.transfer[1].callData, remainingApproval.call_data)
                assert.equal(steps[0].explorerUrl, 'https://base.example.invalid/tx/0xapproval')
                if (rejectRemainingApproval) throw { code: 4001 }
                flow.state.approvalHash = '0xapproval2'
            }
        }
        flow.state.onTransition = step => {
            if (step === 'approve_permit2' && approvalPrompts === 1) {
                return [remainingApproval, ...flow.state.apiActions.slice(1)]
            }
        }

        await flow.render().button.props.onClick()

        assert.deepEqual(prompts, rejectRemainingApproval
            ? ['approve_permit2', 'approve_permit2']
            : ['approve_permit2', 'approve_permit2', 'sign', 'publish'])
        assert.deepEqual(flow.calls.transfer.map(props => props.callData), rejectRemainingApproval
            ? ['0xinitial', '0xinitial'] : ['0xinitial', '0xinitial', ''])
        assert.deepEqual(flow.calls.confirmations, rejectRemainingApproval
            ? [{ network: 'BASE_MAINNET', hash: '0xapproval' }]
            : [{ network: 'BASE_MAINNET', hash: '0xapproval' }, { network: 'BASE_MAINNET', hash: '0xapproval2' }])
        assert.deepEqual(flow.calls.storedTransactions, rejectRemainingApproval ? [] : [[swapId, 'pending', '0xtransaction']])
        assert.equal(flow.calls.success, rejectRemainingApproval ? 0 : 1)
        assert.deepEqual(flow.calls.errors, [])
    })
}

test('a rejected signature retains the approval receipt through retry without replacing the swap', async () => {
    const flow = createWorkflow()
    flow.state.apiActions = [
        { type: 'transfer', step: 'approve_permit2', status: 'action_required', amount: '0', to_address: '0x456',
            network: { name: 'APPROVAL_NETWORK', transaction_explorer_template: 'https://approval.example.invalid/tx/{0}' } },
        ...actionsFor('after-approval').map(action => ({ ...action, status: 'waiting' })),
    ]
    await flow.render().button.props.onClick()
    const approval = flow.stores.useSwapTransactionStore.getState().stepTransactions[swapId].approve_permit2
    assert.equal(approval.explorerUrl, 'https://approval.example.invalid/tx/0xapproval', 'use the action network for its receipt')
    assert.deepEqual(flow.calls.storedTransactions, [], 'a completed approval and rejected signature do not submit a swap')
    assert.equal(flow.render().steps[0].explorerUrl, approval.explorerUrl)
    flow.state.rejectSigning = false
    await flow.render().button.props.onClick()
    assert.equal(flow.calls.transfer.length, 2, 'approval runs once, followed by execution after retry')
    assert.equal(flow.stores.useSwapTransactionStore.getState().stepTransactions[swapId].approve_permit2, approval)
    assert.deepEqual(flow.calls.storedTransactions, [[swapId, 'pending', '0xtransaction']])
    assert.equal(flow.state.swapId, swapId)
})

test('rejecting an approval stores no transaction receipt', async () => {
    const flow = createWorkflow()
    flow.state.apiActions = [{ type: 'transfer', step: 'approve_permit2', status: 'action_required', amount: '0', to_address: '0x456' }]
    flow.state.onWalletPrompt = () => { throw { code: 4001 } }
    await flow.render().button.props.onClick()
    assert.deepEqual(flow.stores.useSwapTransactionStore.getState().stepTransactions, {})
    assert.deepEqual(flow.calls.storedTransactions, [])
    assert.equal(flow.calls.success, 0)
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
        assert.deepEqual(flow.calls.storedTransactions, completes ? [[swapId, 'pending', '']] : [])
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

for (const hasSigned of [false, true]) {
    test(`an expired ${hasSigned ? 'signed token' : 'native token'} quote retries with a new swap`, async () => {
        const flow = createWorkflow()
        flow.render()
        flow.state.apiActions = [
            ...(hasSigned ? [{ step: 'sign', status: 'completed' }] : []),
            { step: 'publish', status: 'failed', detail: "The swap's quote expired; create a new swap." },
        ]
        const signatures = flow.stores.useDepositSignatureStore.getState().signatures
        if (hasSigned) signatures[swapId] = { validBefore: Date.now() / 1000 + 60 }
        await flow.poll()
        let creates = 0
        flow.state.createSwap = async values => {
            creates++
            assert.equal(values.amount, '1', 'retain the requested amount')
            assert.equal(values.from.name, 'BASE_MAINNET')
            assert.equal(signatures[swapId], undefined, 'discard the obsolete self-paid signature')
            flow.state.apiActions = [{ type: 'transfer', step: 'publish', status: 'action_required', amount: 1, to_address: '0xnew-deposit' }]
            return { swap: { id: 'fresh-swap', metadata: {} }, quote: {}, deposit_actions: flow.state.apiActions }
        }

        const retry = flow.render().button
        assert.equal(retry.props.children, 'Try again')
        await retry.props.onClick()

        assert.equal(creates, 1)
        assert.equal(flow.state.swapId, 'fresh-swap')
        assert.deepEqual(flow.calls.refresh, [], 'do not request actions for the expired swap')
        assert.deepEqual(flow.calls.sign, [])
        assert.equal(flow.calls.transfer.length, 1)
        assert.equal(flow.calls.transfer[0].swapId, 'fresh-swap')
        assert.equal(flow.calls.transfer[0].depositAddress, '0xnew-deposit')
        assert.deepEqual(flow.calls.storedTransactions, [['fresh-swap', 'pending', '0xtransaction']])
        assert.deepEqual(flow.calls.errors, [])
    })
}

for (const progress of ['transaction', 'authorization', 'signature']) {
    test(`a late ${progress} prevents replacing a failed workflow`, async () => {
        const flow = createWorkflow()
        flow.render()
        flow.state.apiActions = [{
            step: progress === 'signature' ? 'sign' : 'publish',
            status: 'failed', detail: "The swap's quote expired; create a new swap.",
        }]
        await flow.poll()
        const retry = flow.render().button
        if (progress === 'transaction') {
            flow.stores.useSwapTransactionStore.getState().swapTransactions[swapId] = { status: 'pending', hash: '0xsubmitted' }
        } else if (progress === 'authorization') {
            flow.stores.useGaslessAuthorizationStore.getState().authorizations[swapId] = {
                transaction: { transaction_hash: '0xsubmitted', status: 'pending' },
            }
        } else {
            flow.stores.useDepositSignatureStore.getState().signatures[swapId] = { validBefore: Date.now() / 1000 + 60 }
        }

        await retry.props.onClick()

        assert.equal(flow.state.swapId, swapId)
        assert.deepEqual(flow.calls.refresh, [[swapId, sourceAddress]], 'resume the existing attempt')
        assert.deepEqual(flow.calls.sign, [])
        assert.deepEqual(flow.calls.transfer, [])
        assert.equal(flow.calls.errors[0]?.message, "The swap's quote expired; create a new swap.")
    })
}

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

for (const step of ['publish', 'approve_permit2']) {
test(`closing while ${step} is in flight retains its transaction without a stale UI callback`, async () => {
    const dom = new JSDOM('<div id="root"></div>')
    const previous = Object.getOwnPropertyDescriptors(globalThis)
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
    const flow = createWorkflow({ mounted: true })
    flow.state.apiActions = [{ type: 'transfer', step, status: 'action_required', amount: '1', to_address: '0x456' }]
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
        assert.deepEqual(flow.calls.storedTransactions, step === 'publish' ? [[swapId, 'pending', '0xtransaction']] : [])
        if (step === 'approve_permit2') {
            assert.equal(flow.stores.useSwapTransactionStore.getState().stepTransactions[swapId].approve_permit2.hash, '0xapproval')
        }
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
}

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
            assert.equal(flow.calls.signatures.length, resuming ? 0 : 1, 'the prerequisite is retained separately from gasless state')
            assert.deepEqual(flow.calls.authorizations, [])
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
        assert.deepEqual(flow.calls.authorizations, [])
        assert.deepEqual(flow.calls.signatures, [[swapId, 12345]])
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

for (const atomic of [true, false]) for (const includesActions of [true, false]) {
    test(`critical confirmation uses the created quote before polling, with initial actions ${includesActions}, atomic ${atomic}`, async () => {
        const flow = createWorkflow({ atomic })
        flow.state.swapId = undefined
        flow.state.swapDetails = undefined
        flow.state.depositActionsResponse = undefined
        flow.state.quote = {
            requested_amount: 100, receive_amount: 90, min_receive_amount: 90,
            source_token: { price_in_usd: 1 }, destination_token: { asset: 'TEST', price_in_usd: 1 },
            service_fee: 0, blockchain_fee: 0,
        }
        flow.state.apiActions = atomic ? [atomicFixtures.actions.zero_allowance]
            : [{ type: 'transfer', step: 'deposit', status: 'action_required', amount: 1, to_address: '0x456' }]
        const created = {
            swap: { id: 'quoted-swap', metadata: {} },
            quote: { ...flow.state.quote, receive_amount: 75, min_receive_amount: 75 },
            deposit_actions: includesActions ? flow.state.apiActions : undefined,
        }
        let creates = 0
        flow.state.createSwap = async () => { creates++; return created }

        await flow.render().button.props.onClick()
        const confirmation = flow.render()
        assert.equal(flow.state.swapDetails, undefined, 'whole-swap polling has not returned')
        assert.equal(confirmation.warning, 'By continuing, you agree to receive as low as 75 TEST ($ 75.00)')
        assert.equal(confirmation.button.props.children, 'Continue anyway')
        assert.equal(flow.calls.transfer.length, 0, 'confirmation precedes wallet execution')
        assert.equal(flow.calls.batches.length, 0, 'confirmation precedes atomic execution')
        assert.deepEqual(flow.calls.executionStarts, [], 'keep the full quote until the changed amount is accepted')

        await confirmation.button.props.onClick()
        assert.equal(creates, 1, 'continuing never replaces the confirmed swap')
        assert.deepEqual(flow.calls.refresh, [['quoted-swap', sourceAddress]])
        assert.equal(flow.calls.transfer.length, atomic ? 0 : 1)
        assert.equal(flow.calls.batches.length, atomic ? 1 : 0)
        if (!atomic) assert.equal(flow.calls.transfer[0].swapId, 'quoted-swap')
        assert.deepEqual(flow.calls.executionStarts, ['quoted-swap'])
        assert.deepEqual(flow.calls.errors, [])
    })
}

test('a failed gasless re-sign keeps the live swap resumable without offering a standard transfer', async () => {
    const flow = createWorkflow()
    flow.preferences.gaslessEnabled = true
    flow.state.sourceToken = { contract: '0xtoken', supports_gasless_deposit: true, gasless_standard: 'eip3009' }
    const sign = { ...actionsFor('gasless-retry')[0], signing_standard: 'permit2' }
    flow.state.apiActions = [sign]
    flow.state.rejectSigning = false
    flow.state.onTransition = () => { throw new Error('The transaction is still confirming') }
    flow.render()
    await flow.poll()
    await flow.render().button.props.onClick()
    assert.ok(flow.stores.useGaslessAuthorizationStore.getState().authorizations[swapId])

    flow.state.onWalletPrompt = () => { throw new Error('Wallet provider unavailable') }
    await flow.render().button.props.onClick()
    const unavailable = flow.render()
    assert.equal(flow.preferences.gaslessUnavailable, true)
    assert.equal(unavailable.buttonByText('Switch to standard transfer'), undefined)
    assert.equal(unavailable.buttonByText('Try again').props.isDisabled, false)
    const signaturesBeforeSwitch = flow.calls.sign.length
    await unavailable.viewProps.switchToStandard()
    assert.equal(flow.preferences.gaslessEnabled, true)
    assert.equal(flow.calls.sign.length, signaturesBeforeSwitch, 'a guarded switch cannot request the old signature')

    flow.state.onWalletPrompt = undefined
    flow.state.onTransition = () => {
        flow.state.authorization = { status: 'published', transaction: { transaction_hash: '0xrelayed', status: 'pending' } }
        return [{ ...sign, status: 'completed' }]
    }
    unavailable.buttonByText('Try again').props.onClick()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(flow.state.swapId, swapId)
    assert.equal(flow.calls.success, 1, 'the existing authorization can still be resumed')
    assert.deepEqual(flow.calls.storedTransactions, [[swapId, 'pending', '0xrelayed']])
})

for (const progress of ['authorization', 'signature', 'transaction']) {
    test(`a ${progress} arriving after render prevents switching to standard`, async () => {
        const flow = createWorkflow()
        flow.preferences.gaslessEnabled = true
        flow.preferences.reportGaslessUnavailable('deposit')
        flow.state.apiActions = [actionsFor('sign-only')[0]]
        flow.render()
        await flow.poll()
        const { buttonByText } = flow.render()
        const button = buttonByText('Switch to standard transfer')
        assert.ok(button)
        if (progress === 'authorization') {
            flow.stores.useGaslessAuthorizationStore.getState().authorizations[swapId] = { validBefore: Date.now() / 1000 + 1800 }
        } else if (progress === 'signature') {
            flow.stores.useDepositSignatureStore.getState().signatures[swapId] = { validBefore: Date.now() / 1000 + 1800 }
        } else {
            flow.stores.useSwapTransactionStore.getState().swapTransactions[swapId] = { status: 'pending', hash: '0xpending' }
        }
        await button.props.onClick()
        assert.equal(flow.preferences.gaslessEnabled, true)
        assert.equal(flow.preferences.gaslessUnavailable, true)
        assert.deepEqual(flow.calls.refresh, [])
        assert.deepEqual(flow.calls.sign, [])
        assert.deepEqual(flow.calls.transfer, [])
    })
}

test('a terminal authorization with no submission can switch to a new standard swap', async () => {
    const flow = createWorkflow()
    flow.preferences.gaslessEnabled = true
    flow.preferences.reportGaslessUnavailable('deposit')
    const authorizations = flow.stores.useGaslessAuthorizationStore.getState().authorizations
    authorizations[swapId] = { status: 'rejected' }
    let creates = 0
    flow.state.createSwap = async () => {
        creates++
        assert.equal(flow.preferences.gaslessEnabled, false)
        flow.state.apiActions = [{ type: 'transfer', step: 'deposit', status: 'action_required', amount: 1, to_address: '0x456' }]
        return { swap: { id: 'standard-swap', metadata: {} }, quote: {}, deposit_actions: flow.state.apiActions }
    }
    await flow.render().buttonByText('Switch to standard transfer').props.onClick()
    assert.equal(creates, 1)
    assert.equal(authorizations[swapId], undefined)
    assert.deepEqual(flow.calls.sign, [])
    assert.equal(flow.calls.transfer.length, 1)
    assert.equal(flow.calls.transfer[0].swapId, 'standard-swap')
    assert.deepEqual(flow.calls.errors, [])
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

test('a self-paid prerequisite cannot lock replacement but an unclassified accepted signature does', () => {
    const depositSignature = { validBefore: Date.now() / 1000 + 60 }
    const actions = actionsFor('self-paid')
    actions[0].status = 'completed'
    assert.equal(swapProgress.hasSwapExecutionProgress({ depositActions: [actions[0]], depositSignature }), true)
    assert.equal(swapProgress.hasSwapExecutionProgress({ depositActions: actions, depositSignature }), false)
    assert.equal(swapProgress.hasSwapExecutionProgress({ depositActions: actions, gaslessAuthorization: depositSignature }), false,
        'legacy self-paid markers do not count as live authorizations')
    assert.equal(swapProgress.hasSwapExecutionProgress({
        depositActions: actions,
        gaslessAuthorization: { ...depositSignature, transaction: { transaction_hash: '0xsubmitted', status: 'pending' } },
    }), true, 'transaction evidence still locks replacement')
})

for (const [name, actions] of [
    ['self-paid approval', [
        { step: 'approve_permit2', status: 'action_required', type: 'transfer', amount: 0, to_address: '0x456' },
        { step: 'sign', status: 'pending' },
        { step: 'publish', status: 'pending' },
    ]],
    ['self-paid signing', [
        { step: 'approve_permit2', status: 'completed' },
        actionsFor('self-paid')[0],
        { step: 'publish', status: 'pending' },
    ]],
    ['gasless approval', [
        { step: 'approve_permit2', status: 'action_required', type: 'transfer', amount: 0, to_address: '0x456' },
        { step: 'sign', status: 'pending' },
    ]],
]) {
    test(`future pending steps behind ${name} do not lock replacement`, () => {
        assert.equal(swapProgress.hasSwapExecutionProgress({ depositActions: actions }), false)
    })
}

test('current pending work and completed execution still lock replacement', () => {
    for (const step of ['sign', 'publish', 'deposit']) {
        for (const status of ['pending', 'completed']) {
            assert.equal(swapProgress.hasSwapExecutionProgress({ depositActions: [
                { step: 'approve_permit2', status: 'completed' },
                { step, status },
            ] }), true, `${status} ${step} can still move funds`)
        }
    }
})

test('enabling gasless after rejecting self-paid signing creates a new swap with future pending steps', async () => {
    const flow = createWorkflow()
    flow.state.sourceToken = { contract: '0xtoken', supports_gasless_deposit: true, gasless_standard: 'eip3009' }
    flow.state.apiActions = [
        { step: 'approve_permit2', status: 'completed' },
        actionsFor('self-paid')[0],
        { step: 'publish', status: 'pending' },
    ]
    flow.render()
    await flow.poll()
    await flow.render().button.props.onClick()
    assert.deepEqual(flow.calls.sign, ['self-paid'])
    assert.deepEqual(flow.calls.storedTransactions, [], 'declining the prerequisite does not submit the swap')

    flow.preferences.gaslessEnabled = true
    let creates = 0
    flow.state.createSwap = async () => {
        creates++
        assert.equal(flow.preferences.gaslessEnabled, true)
        flow.state.apiActions = [{ ...actionsFor('gasless')[0], signing_standard: 'eip3009' }]
        return { swap: { id: 'gasless-swap', metadata: {} }, quote: {}, deposit_actions: flow.state.apiActions }
    }
    await flow.render().button.props.onClick()

    assert.equal(creates, 1, 'the changed preference replaces the unsubmitted self-paid swap')
    assert.equal(flow.state.swapId, 'gasless-swap')
    assert.deepEqual(flow.calls.sign, ['self-paid', 'gasless'], 'the old self-paid signature is never requested again')
    assert.deepEqual(flow.calls.refresh, [[swapId, sourceAddress]], 'only the first attempt refreshes the old swap')
    assert.deepEqual(flow.calls.transfer, [])
    assert.deepEqual(flow.calls.errors, [])
})

test('the mounted controller and real polling resume a mined partial approval with identical calldata', async t => {
    const dom = new JSDOM('<div id="root"></div>', { url: 'https://widget.test' })
    const previous = Object.getOwnPropertyDescriptors(globalThis)
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true })
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    const flow = createWorkflow({ mounted: true, realPolling: true })
    const { SWRConfig } = require('swr')
    const approval = { type: 'transfer', step: 'approve_permit2', status: 'action_required', amount: 0,
        to_address: '0x456', call_data: `0x095ea7b3${'123'.padStart(64, '0')}${(5841963).toString(16).padStart(64, '0')}` }
    flow.state.apiActions = [approval, ...actionsFor('fresh').map(action => ({ ...action, status: 'pending' }))]
    flow.state.rejectSigning = false
    flow.state.receipts = new Map()
    const firstApproval = Promise.withResolvers()
    const secondApproval = Promise.withResolvers()
    const prompts = []
    flow.state.onWalletPrompt = step => {
        prompts.push(step)
        if (step === 'approve_permit2') return prompts.length === 1 ? firstApproval.promise : secondApproval.promise
        if (step === 'sign') {
            flow.state.apiActions = flow.state.apiActions.map(action => ({
                ...action, status: action.step === 'publish' ? 'action_required' : 'completed',
            }))
        }
    }
    const root = createRoot(document.getElementById('root'))
    let execution
    try {
        await act(async () => root.render(createElement(SWRConfig, { value: {
            provider: () => new Map(), revalidateOnFocus: false, revalidateOnReconnect: false, isVisible: () => true,
        } }, createElement(flow.Component))))
        await act(async () => { execution = flow.view.handleClick() })
        assert.deepEqual(prompts, ['approve_permit2'])

        await act(async () => { firstApproval.resolve() })
        for (let i = 0; i < 2; i++) await act(async () => { t.mock.timers.tick(2000) })
        assert.equal(flow.view.actionStateText, 'Confirming approval…')
        assert.equal(flow.calls.transfer.length, 1, 'pending receipt cannot trigger duplicate approval')

        flow.state.receipts.set('0xapproval', 'Completed')
        for (let i = 0; i < 2; i++) await act(async () => { t.mock.timers.tick(2000) })
        assert.deepEqual(prompts, ['approve_permit2', 'approve_permit2'])
        assert.equal(flow.view.actionStateText, 'Approve in your wallet')
        assert.equal(flow.view.depositActions[0].status, 'action_required')
        assert.equal(flow.calls.transfer[0].callData, flow.calls.transfer[1].callData)
        assert.deepEqual(flow.calls.sign, [], 'the partial approval cannot advance to signing')

        flow.state.approvalHash = '0xapproval2'
        await act(async () => { secondApproval.resolve() })
        for (let i = 0; i < 2; i++) await act(async () => { t.mock.timers.tick(2000) })
        assert.equal(flow.calls.transfer.length, 2, 'the old receipt cannot confirm the new approval')

        flow.state.receipts.set('0xapproval2', 'Completed')
        flow.state.apiActions = [{ step: 'approve_permit2', status: 'completed' }, ...actionsFor('fresh')]
        for (let i = 0; i < 4 && flow.calls.success === 0; i++) await act(async () => { t.mock.timers.tick(2000) })
        assert.deepEqual(prompts, ['approve_permit2', 'approve_permit2', 'sign', 'publish'])
        assert.deepEqual(flow.calls.storedTransactions, [[swapId, 'pending', '0xtransaction']])
        assert.equal(flow.calls.success, 1)
        assert.deepEqual(flow.calls.errors, [])
        await execution
    } finally {
        await act(async () => root.unmount())
        firstApproval.resolve()
        secondApproval.resolve()
        await execution
        dom.window.close()
        for (const key of ['window', 'document', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT']) {
            if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
            else delete globalThis[key]
        }
    }
})
