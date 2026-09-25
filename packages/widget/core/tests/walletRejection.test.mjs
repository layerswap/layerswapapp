import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)

// Load source directly so these regressions do not depend on a stale dist build.
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

const { ActionMessageType } = loadSource('../../types/src/actionMessage.ts')
const walletTypes = { ActionMessageType }
const walletPath = '../src/components/Pages/Swap/Withdraw/Wallet/Common/'
const walletErrors = loadSource('../../../wallets/core/src/lib/walletErrors.ts', { '@layerswap/widget-types': walletTypes })
const { isUserRejection } = loadSource(`${walletPath}isUserRejection.ts`, { '@layerswap/wallet-core/errors': walletErrors })

const rejections = [
    { code: 4001 },
    { code: '4001' },
    { code: 'ACTION_REJECTED' },
    { name: ActionMessageType.TransactionRejected, reasonCode: 'user_rejected' },
    { name: 'UserRejectedRequestError' },
    { message: 'MetaMask Typed Message Signature: User denied message signature.' },
    'User rejected the request.',
    { code: -32603, cause: { code: 4001 } },
    { code: -32603, data: { originalError: { code: 4001 } } },
    { cause: { cause: { message: 'User rejected the request.' } } },
    { info: { error: { code: '4001' } } },
    new Error('Could not sign', { cause: { message: 'Request rejected by user' } }),
]

test('recognizes serialized and nested wallet cancellations without relying on Error identity', () => {
    for (const error of rejections) assert.equal(isUserRejection(error), true, JSON.stringify(error))
})

test('keeps real failures distinct and handles cyclic provider errors', () => {
    const cyclic = { code: -32603, message: 'Internal RPC error' }
    cyclic.cause = cyclic
    for (const error of [undefined, null, { name: ActionMessageType.TransactionRejected }, cyclic, new Error('Signature expired'), { message: 'Transaction rejected by RPC' }, { code: -32000 }]) {
        assert.equal(isUserRejection(error), false)
    }
    cyclic.data = { originalError: { code: 4001 } }
    assert.equal(isUserRejection(cyclic), true)
})

const { ActionMessages } = loadSource('../src/components/Pages/Swap/Withdraw/messages/TransactionMessages.tsx', {
    './Message': { default: () => null, WalletUnknownError: () => null },
    '@/lib/address/Address': {},
})
const depositActions = loadSource('../src/helpers/depositActions.ts')
const presentation = loadSource('../src/components/Pages/Swap/Withdraw/Presentation/ActionMessageView.tsx', {
    '@layerswap/widget-types': walletTypes,
    '../Wallet/Common/isUserRejection': { isUserRejection },
    '../messages/Message': { WalletUnknownError: () => null },
    '../messages/TransactionMessages': { ActionMessages },
})
const gaslessState = {
    gaslessUnavailable: false,
    gaslessErrorMessage: null,
    reportGaslessUnavailable() { this.gaslessUnavailable = true },
}
const useGaslessPreferenceStore = Object.assign(selector => selector(gaslessState), { getState: () => gaslessState })
const { ActionMessage: ActionMessageController } = loadSource(`${walletPath}actionMessage.tsx`, {
    react: { useEffect: () => {} },
    '@layerswap/widget-types': walletTypes,
    '../../Presentation/ActionMessageView': presentation,
    '@/lib/ErrorHandler': { ErrorHandler: () => {} },
    '@/stores/gaslessPreferenceStore': { useGaslessPreferenceStore },
    '@/context/swap': { useSwapDataState: () => ({ swapError: 'A generic workflow error is also present' }) },
    './isUserRejection': { isUserRejection },
})

function ActionMessage(props) {
    const view = ActionMessageController(props)
    return view.type(view.props)
}

test('signing cancellation selects signing copy even when a generic swap error exists', () => {
    for (const error of [...rejections, { name: ActionMessageType.TransactionRejected }]) {
        const message = ActionMessage({ error, isSignatureError: true, isLoading: false })
        assert.equal(message.type, ActionMessages.TransactionRejectedMessage)
        const content = message.type(message.props)
        assert.equal(content.props.header, 'Signing rejected')
        assert.match(content.props.details, /rejected the signing request/)
    }
    const transaction = ActionMessage({ error: { code: 4001 }, isLoading: false })
    assert.equal(transaction.type(transaction.props).props.header, 'Transaction rejected')
    assert.equal(ActionMessage({ error: new Error('Signature expired'), isSignatureError: true, isLoading: false }).type, ActionMessages.SwapErrorMessage)
})

test('raw EVM signing cancellation survives the resolver and authorization workflow', async () => {
    const cancellation = { code: -32603, data: { originalError: { code: 4001 } } }
    const { createEVMGaslessProvider } = loadSource('../../../wallets/adapters/evm/src/gaslessProvider/createEVMGaslessProvider.ts', {
        '@layerswap/wallet-core': { foregroundWalletApp: async () => {} },
        '@wagmi/core': { getAccount: () => ({ connector: { getProvider: async () => ({
            request: async ({ method }) => {
                assert.equal(method, 'eth_signTypedData_v4')
                throw cancellation
            },
        }) } }) },
    })
    const { GaslessResolver } = loadSource('../src/lib/gasless/gaslessResolver.ts')
    const { executeGaslessAuthorization } = loadSource(`${walletPath}depositExecution.ts`, {
        '@layerswap/widget-types': walletTypes,
        '@/lib/apiClients/layerSwapApiClient': { BackendTransactionStatus: { Pending: 'pending' } },
        '@/stores/swapTransactionStore': { useGaslessAuthorizationStore: { getState: () => assert.fail('A rejected signature must not be stored') } },
        '@/stores/gaslessPreferenceStore': { useGaslessPreferenceStore },
        './isUserRejection': { isUserRejection },
        '@/helpers/depositActions': depositActions,
        '@/lib/swapLifecycle': { lifecycleContextFromSwap: () => ({}), lifecycleErrorDetails: () => ({}) },
        '@/lib/widgetTelemetry': { widgetTelemetry: { beginOperation: () => () => {} } },
        './executeWalletOperation': {},
        '@/lib/ErrorHandler': { ErrorHandler: () => assert.fail('Cancellation must not be reported as a transfer failure') },
    })
    const resolver = new GaslessResolver([createEVMGaslessProvider({}, () => true)])
    const signAction = { step: 'sign', type: 'sign', typed_data: { message: {} } }

    for (const depositActions of [[signAction], [signAction, { step: 'publish' }]]) {
        gaslessState.gaslessUnavailable = false
        await assert.rejects(executeGaslessAuthorization({
            swapData: { id: 'test-swap' },
            swapBasicData: {},
            selectedWallet: { providerName: 'EVM' },
            onLifecycle: () => {},
            sourceAddress: '0x1',
            depositActions,
            layerswapApiClient: { AuthorizeSwapAsync: () => assert.fail('A rejected signature must not be authorized') },
            setActionStateText: () => {},
            setSwapTransaction: () => assert.fail('A rejected signature must not create a pending transaction'),
            onSuccess: () => assert.fail('A rejected signature is not success'),
        }, action => resolver.signGaslessDeposit({ network: { name: 'BASE_MAINNET' }, address: '0x1', typedData: action.typed_data }), signAction), error => error === cancellation)
        assert.equal(gaslessState.gaslessUnavailable, false)
        assert.equal(ActionMessage({ error: cancellation, isSignatureError: true, isLoading: false }).type, ActionMessages.TransactionRejectedMessage)
    }
})
