import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const core = new URL('../../../packages/widget/core/src/', import.meta.url);
const coreRequire = createRequire(new URL('../package.json', core));
const dom = new JSDOM('<div id="root"></div>', { url: 'https://widget.example.invalid' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { default: useSWR, SWRConfig } = coreRequire('swr');
const container = document.getElementById('root');
const noop = () => {};
const empty = () => null;
const childrenOnly = ({ children }) => React.createElement(React.Fragment, null, children);

// Use current source with real React state. Only external services and unrelated
// presentation are replaced, so these regressions do not depend on a dist build.
function loadSource(path, imports = {}) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, core), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    });
    const module = { exports: {} };
    new Function('require', 'module', 'exports', outputText)(name => {
        if (name === 'react' || name === 'react/jsx-runtime') return require(name);
        if (name in imports) return imports[name];
        throw new Error(`Unexpected dependency: ${name}`);
    }, module, module.exports);
    return module.exports;
}

const withdraw = 'components/Pages/Swap/Withdraw/';
const fees = 'components/Pages/Swap/Form/FeeDetails/';
const gasless = loadSource('helpers/gasless.ts');
const { useGaslessPreferenceStore } = loadSource('stores/gaslessPreferenceStore.ts', { zustand: coreRequire('zustand') });
const motion = {
    'framer-motion': { motion: { div: childrenOnly }, AnimatePresence: childrenOnly, useIsPresent: () => true },
    '@/hooks/useHydratedReducedMotion': { useHydratedReducedMotion: () => false },
    './swapFlowAnimation': loadSource(`${withdraw}Presentation/swapFlowAnimation.ts`),
};
const transition = loadSource(`${withdraw}Presentation/WalletExecutionTransition.tsx`, motion);
const sections = loadSource(`${withdraw}Presentation/Page2Sections.tsx`, {
    ...motion,
    './WalletExecutionTransition': transition,
    '../Processing/StepsComponent': { StepsPanelProvider: childrenOnly },
});
const network = { name: 'BASE_MAINNET', type: 'evm' };
const token = { symbol: 'USDC', contract: '0xtoken', supports_gasless_deposit: true, gasless_standard: 'eip3009' };
const wallet = { id: 'wallet', address: '0xsource', isActive: true, asSourceSupportedNetworks: [network.name] };
const account = { id: wallet.id, address: wallet.address };
const walletHooks = {
    '@/hooks/useWallet': { default: () => ({ wallets: [wallet], provider: { connectedWallets: [wallet] } }) },
    '@/context/swapAccounts': { useSelectedAccount: () => account },
};

test('switching gasless mode preserves the live execution lock while swap creation is pending', async () => {
    const root = createRoot(container);
    let resolveCreation;
    const creation = new Promise(resolve => { resolveCreation = resolve; });
    let creates = 0;
    let mounts = 0;
    let unmounts = 0;
    let viewProps;
    const errors = [];
    const swapBasicData = {
        source_network: network, destination_network: network,
        source_token: token, destination_token: { symbol: 'ETH' },
        requested_amount: '1', use_deposit_address: false,
    };
    const context = { swapBasicData, setSwapError: noop };
    const stores = {
        useSwapTransactionStore: selector => selector({ swapTransactions: {}, setSwapTransaction: noop }),
        useGaslessAuthorizationStore: selector => selector({ authorizations: {} }),
    };
    const swapHooks = {
        useSwapDataState: () => context,
        useSwapDataUpdate: () => ({
            createSwap: () => { creates++; return creation; },
            setSwapId: noop,
        }),
    };
    const { SendTransactionButton } = loadSource(`${withdraw}Wallet/Common/buttons.tsx`, {
        ...walletHooks,
        '@/context/callbackProvider': { useCallbacks: () => ({ onSwapLifecycle: noop }) },
        '@/lib/swapLifecycle': { lifecycleContextFromSwap: () => ({}) },
        '@/hooks/useTransferBlocked': { useTransferBlocked: noop },
        '@/helpers/swapProgress': { hasSwapExecutionProgress: () => false },
        '@/helpers/gasless': gasless,
        './isUserRejection': { isUserRejection: () => false },
        swr: { default: () => ({}), useSWRConfig: () => ({ mutate: noop }) },
        '@/components/utils/numbers': { isDiffByPercent: () => false },
        '@/components/Wallet/WalletModal': { useConnectModal: () => ({}) },
        '@/context/depositSettings': { useDepositSettings: () => ({}) },
        '@/context/settings': { useInitialSettings: () => ({}), useSettingsState: () => ({ networks: [network] }) },
        '@/context/swap': swapHooks,
        '@/context/withdrawalContext': { useWalletWithdrawalState: () => ({}) },
        '@/lib/apiClients/layerSwapApiClient': { default: class {} },
        '@/lib/balances/useBalance': { useBalance: () => ({}) },
        '@/lib/ErrorHandler': { ErrorHandler: error => errors.push(error) },
        '@/lib/fees': { resolvePriceImpactValues: noop },
        '@/lib/gases/useSWRGas': { default: () => ({}) },
        '@/stores/gaslessPreferenceStore': { useGaslessPreferenceStore },
        '@/stores/swapTransactionStore': stores,
        '@layerswap/utils': { sleep: noop },
        '../../Presentation/WalletActionsView': {
            SendTransactionView: props => {
                viewProps = props;
                return React.createElement('button', {
                    disabled: props.loading,
                    onClick: props.gaslessUnavailable ? props.switchToStandard : props.handleClick,
                }, props.loading ? 'Preparing swap' : 'Switch to standard transfer');
            },
        },
        './depositExecution': loadSource('helpers/depositActions.ts'),
    });
    function WalletController() {
        React.useEffect(() => { mounts++; return () => { unmounts++; }; }, []);
        return React.createElement(SendTransactionButton, { swapData: swapBasicData, refuel: false, onClick: noop });
    }
    const { default: SwapDetails } = loadSource(`${withdraw}SwapDetails.tsx`, {
        ...walletHooks,
        './Presentation/Page2Sections': sections,
        '@/helpers/swapFlow': loadSource('helpers/swapFlow.ts'),
        '@/hooks/useIsGaslessActive': { useIsGaslessActive: () => useGaslessPreferenceStore(state => state.gaslessEnabled) },
        './Summary': { default: empty },
        './SwapQuoteDetails': { SwapQuoteDetails: empty },
        './Presentation/Page2Contained': { Page2Contained: childrenOnly },
        '@/components/Common/Sceletons': { SwapDetailsSceleton: empty },
        '@/components/Widget/Index': { Widget: childrenOnly },
        '@/context/callbackProvider': { useCallbacks: () => ({ onBackClick: noop, onSwapLifecycle: noop }) },
        '@/lib/swapLifecycle': { lifecycleContextFromSwap: () => ({}) },
        '@/context/swap': swapHooks,
        '@/hooks/useGaslessAuthorizationStatus': { useGaslessAuthorizationStatus: noop },
        '@/hooks/useResolvedSwapStatus': { useResolvedSwapStatus: () => ({ showWithdrawScreen: true }) },
        '@/hooks/useSwapRetry': { useSwapRetry: () => ({}) },
        './ManualWithdraw': { default: empty },
        './Presentation/RetryView': { RetryView: empty },
        './Processing': { default: empty },
        './Withdraw': { default: WalletController },
    });

    useGaslessPreferenceStore.getState().resetGaslessPreference();
    useGaslessPreferenceStore.getState().reportGaslessUnavailable('create');
    try {
        await act(async () => root.render(React.createElement(SwapDetails, { type: 'contained' })));
        await act(() => container.querySelector('button').click());
        assert.equal(useGaslessPreferenceStore.getState().gaslessEnabled, false);
        assert.equal(creates, 1);
        assert.equal(mounts, 1, 'mode changes must preserve the executing controller');
        assert.equal(unmounts, 0);
        assert.equal(container.querySelector('button').disabled, true);
        await act(() => viewProps.handleClick());
        assert.equal(creates, 1, 'the live execution lock rejects another invocation');
        await act(async () => { resolveCreation(undefined); await creation; });
        assert.equal(errors.length, 1, 'the deferred response is handled by the original controller');
    } finally {
        resolveCreation(undefined);
        await act(() => root.unmount());
        useGaslessPreferenceStore.getState().resetGaslessPreference();
    }
});

test('live recipient visibility waits for the sender and falls back to the selected account during creation', async () => {
    const root = createRoot(container);
    let selectedAccount;
    let showDestinationAddress = true;
    const source = '0x11111111111111111111111111111111111111abcd';
    const other = '0x2222222222222222222222222222222222222222';
    const swapBasicData = {
        source_network: network, destination_network: network,
        source_token: token, destination_token: { symbol: 'ETH' },
        requested_amount: '1', use_deposit_address: false,
        destination_address: source,
    };
    const context = {
        swapBasicData, swapId: 'existing-swap',
        swapDetails: { source_address: source.toUpperCase() },
        quote: { source_network: network },
    };
    const { QuoteSummaryView } = loadSource(`${withdraw}Presentation/QuoteSummaryView.tsx`, {
        './swapFlowAnimation': motion['./swapFlowAnimation'],
        '@/components/Common/NumFlowWithFallback': { default: empty },
        '@/components/Common/RecipientAddressView': {
            RecipientAddressView: ({ address }) => React.createElement('span', { 'data-recipient': true }, address),
        },
        clsx: { default: require('clsx') },
        'lucide-react': { ChevronDown: empty },
    });
    const { SummaryRow } = loadSource(`${fees}SwapQuote/SummaryRow.tsx`, {
        '@/components/Input/Address/AddressPicker/AddressWithIcon': { ExtendedAddress: empty },
        '@/context/depositSettings': { useDepositSettings: () => ({ showDestinationAddress }) },
        '@/context/settings': { useInitialSettings: () => ({}) },
        '@/lib/address/Address': { Address: { isValid: () => false } },
        '@/stores/addressBookStore': { useAddressName: noop },
        '..': { DetailsButton: empty },
        '../Slippage': { Slippage: empty },
        './DetailedEstimates': { GasFee: empty },
        '../../../Withdraw/Presentation/QuoteSummaryView': { QuoteSummaryView },
    });
    const liveWalletHooks = {
        '@/hooks/useWallet': { default: () => ({ wallets: [] }) },
        '@/context/swapAccounts': { useSelectedAccount: () => selectedAccount },
    };
    const quoteComponent = loadSource(`${fees}SwapQuote/index.tsx`, {
        ...liveWalletHooks,
        '@/lib/address/Address': {},
        '../../../Withdraw/Presentation/QuoteView': { QuoteView: ({ summary }) => summary },
        './DetailedEstimates': { DetailedEstimates: empty },
        './SummaryRow': { SummaryRow },
    });
    const quoteDetails = loadSource(`${withdraw}SwapQuoteDetails.tsx`, {
        '../Form/FeeDetails/SwapQuote': quoteComponent,
        './Presentation/QuoteAvailabilityView': { QuoteAvailabilityView: childrenOnly },
    });
    const { default: SwapDetails } = loadSource(`${withdraw}SwapDetails.tsx`, {
        ...liveWalletHooks,
        './Presentation/Page2Sections': sections,
        '@/helpers/swapFlow': loadSource('helpers/swapFlow.ts'),
        '@/hooks/useIsGaslessActive': { useIsGaslessActive: () => false },
        './Summary': { default: empty },
        './SwapQuoteDetails': quoteDetails,
        './Presentation/Page2Contained': { Page2Contained: childrenOnly },
        '@/components/Common/Sceletons': { SwapDetailsSceleton: empty },
        '@/components/Widget/Index': { Widget: childrenOnly },
        '@/context/callbackProvider': { useCallbacks: () => ({ onBackClick: noop, onSwapLifecycle: noop }) },
        '@/lib/swapLifecycle': {},
        '@/context/swap': { useSwapDataState: () => context },
        '@/hooks/useGaslessAuthorizationStatus': { useGaslessAuthorizationStatus: noop },
        '@/hooks/useResolvedSwapStatus': { useResolvedSwapStatus: () => ({ showWithdrawScreen: !context.swapDetails }) },
        '@/hooks/useSwapRetry': { useSwapRetry: () => ({}) },
        './ManualWithdraw': { default: empty },
        './Presentation/RetryView': { RetryView: empty },
        './Processing': { default: empty },
        './Withdraw': { default: empty },
    });
    const render = () => act(() => root.render(React.createElement(SwapDetails, { type: 'contained' })));
    const recipient = () => container.querySelector('[data-recipient]');
    try {
        await render();
        assert.equal(recipient(), null, 'same-address receipt is hidden before the wallet restores');
        selectedAccount = { address: source };
        await render();
        assert.equal(recipient(), null, 'restoring the wallet does not change the row');
        selectedAccount = { address: other };
        await render();
        assert.equal(recipient(), null, 'switching wallets cannot change an existing receipt');

        context.swapDetails = { source_address: other };
        selectedAccount = undefined;
        await render();
        const differentRecipient = recipient();
        assert.equal(differentRecipient?.textContent, source, 'different recipient shows immediately');
        selectedAccount = { address: source };
        await render();
        assert.equal(recipient(), differentRecipient, 'reconnecting the recipient wallet cannot hide the row');

        context.swapDetails = {};
        selectedAccount = undefined;
        await render();
        assert.equal(recipient(), null, 'do not assume the recipient differs while the sender is unknown');
        selectedAccount = { address: source };
        await render();
        assert.equal(recipient(), null, 'restoring the same account must not flash Send to');

        context.swapDetails = undefined;
        context.swapId = undefined;
        await render();
        assert.equal(recipient(), null, 'before creating a swap, the selected account is used');

        context.swapId = 'just-created';
        context.swapDetails = { id: 'just-created' };
        await render();
        assert.equal(recipient(), null, 'creation must not reveal Send to when the API omits the sender');
        selectedAccount = { address: other };
        await render();
        assert.equal(recipient()?.textContent, source, 'a different selected sender reveals the destination');
        context.swapDetails = { id: 'just-created', source_address: source };
        await render();
        assert.equal(recipient(), null, 'the recorded sender takes precedence over the connected wallet');

        context.swapDetails = undefined;
        context.swapId = undefined;
        selectedAccount = { address: other };
        await render();
        assert.equal(recipient()?.textContent, source, 'new swaps follow intentional account changes');
        showDestinationAddress = false;
        await render();
        assert.equal(recipient(), null, 'deposit settings still control recipient visibility');
    } finally {
        await act(() => root.unmount());
    }
});

test('compact quote controls retain their nodes and cached values without gas refreshes', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const root = createRoot(container);
    const requests = [];
    const gasHook = loadSource('lib/gases/useSWRGas.tsx', {
        swr: { default: useSWR },
        '../resolvers/resolverService': { resolverService: { getGasResolver: () => ({
            getGas: async args => { requests.push(args); return { gas: 0.01, token: { asset: 'ETH' } }; },
        }) } },
    });
    const shared = {
        ...walletHooks,
        '@/helpers/gasless': gasless,
        '@/helpers/tokenHelper': { resolveTokenUsdPrice: () => 100 },
        '@/lib/gases/useSWRGas': gasHook,
        '@/lib/nft/useSWRNftBalance': { default: () => ({}) },
        '@/stores/gaslessPreferenceStore': { useGaslessPreferenceStore },
        '@/components/Input/Address/AddressPicker/AddressWithIcon': { ExtendedAddress: empty },
        '@/lib/address/Address': { Address: { isValid: () => false } },
    };
    const gasFees = loadSource(`${fees}SwapQuote/DetailedEstimates.tsx`, {
        ...shared,
        './GasFeeView': { GasFeeView: ({ gas }) => React.createElement('span', { 'data-gas': true }, gas) },
        './DetailedEstimatesView': { DetailedEstimatesView: empty },
        '../Slippage': { Slippage: empty },
    });
    const details = loadSource(`${fees}index.tsx`, {
        ...shared,
        '../../Withdraw/Presentation/ManualQuoteView': { ManualQuoteView: empty },
        '../../Withdraw/Presentation/QuoteDetailsSummary': {
            QuoteDetailsSummary: ({ gasFeeInUsd }) => React.createElement('span', { 'data-details': true }, gasFeeInUsd),
        },
        './SwapQuote/DetailedEstimates': gasFees,
    });
    const { SummaryRow } = loadSource(`${fees}SwapQuote/SummaryRow.tsx`, {
        ...shared,
        '@/context/depositSettings': { useDepositSettings: () => ({ showDestinationAddress: false }) },
        '@/context/settings': { useInitialSettings: () => ({}) },
        '@/stores/addressBookStore': { useAddressName: noop },
        '..': details,
        '../Slippage': { Slippage: empty },
        './DetailedEstimates': gasFees,
        '../../../Withdraw/Presentation/QuoteSummaryView': loadSource(`${withdraw}Presentation/QuoteSummaryView.tsx`, {
            './swapFlowAnimation': motion['./swapFlowAnimation'],
            '@/components/Common/NumFlowWithFallback': { default: empty },
            '@/components/Common/RecipientAddressView': { RecipientAddressView: empty },
            clsx: { default: require('clsx') },
            'lucide-react': { ChevronDown: empty },
        }),
    });
    const cache = new Map();
    let onFocus;
    const config = {
        provider: () => cache,
        dedupingInterval: 0,
        focusThrottleInterval: 0,
        initFocus: callback => { onFocus = callback; return noop; },
    };
    const view = compact => React.createElement(SWRConfig, { value: config }, React.createElement(SummaryRow, {
        compact, isOpen: true,
        values: { from: network, fromAsset: token, amount: '1' },
        quoteData: { quote: { source_network: network } },
    }));
    const tick = async ms => act(async () => { t.mock.timers.tick(ms); });
    try {
        await act(async () => root.render(view(true)));
        await tick(60_000);
        assert.equal(requests.length, 0, 'initially compact quotes do not request gas');
        await act(async () => root.render(view(false)));
        assert.equal(requests.length, 2, 'both gas controller keys initially fetch');
        const gasNode = container.querySelector('[data-gas]');
        const detailsNode = container.querySelector('[data-details]');
        assert.equal(gasNode.textContent, '0.01');
        await act(async () => root.render(view(true)));
        await tick(120_000);
        await act(async () => onFocus());
        await tick(10);
        assert.equal(requests.length, 2, 'compact controls stop interval and focus revalidation');
        assert.equal(container.querySelector('[data-gas]'), gasNode);
        assert.equal(container.querySelector('[data-details]'), detailsNode);
        assert.equal(gasNode.textContent, '0.01', 'cached content remains available during collapse');
        await act(async () => root.render(view(false)));
        const beforeRefresh = requests.length;
        await tick(60_000);
        assert.ok(requests.length > beforeRefresh, 'expanding restores gas refreshes');
    } finally {
        await act(() => root.unmount());
        t.mock.timers.reset();
    }
});

function createSwapHistoryHarness(fetcher) {
    const api = {
        default: class { fetcher = fetcher; },
        TransactionType: { Input: 'input', Output: 'output', Refuel: 'refuel', Refund: 'refund' },
        BackendTransactionStatus: { Completed: 'completed', Pending: 'pending', Failed: 'failed' },
        TransactionStatus: { Completed: 'completed', Pending: 'pending', Failed: 'failed' },
    };
    const widgetTypes = loadSource('../../types/src/SwapStatus.ts');
    const progressTypes = loadSource(`${withdraw}Processing/types.ts`);
    const rangeErrors = loadSource('Models/RangeError.ts');
    const formatTime = loadSource('components/utils/formatTime.ts');
    const phases = loadSource('components/utils/resolveSwapPhase.ts', {
        './swapPhase': loadSource('components/utils/swapPhase.ts'),
        '@layerswap/widget-types': widgetTypes,
        '../../lib/apiClients/layerSwapApiClient': api,
        '../../Models/RangeError': rangeErrors,
        '../Pages/Swap/Withdraw/Processing/types': progressTypes,
        './formatTime': formatTime,
    });
    const shared = {
        '@/lib/apiClients/layerSwapApiClient': api,
        '@/components/utils/resolveSwapPhase': phases,
        '@/helpers/depositActions': loadSource('helpers/depositActions.ts'),
        '@/components/utils/RoundDecimals': loadSource('components/utils/RoundDecimals.ts'),
        './TransferStatusHeader': loadSource(`${withdraw}Presentation/TransferStatusHeader.tsx`, {
            '../Processing/gauge': { Gauge: empty },
        }),
        '../Processing/types': progressTypes,
        '../Processing/StepsComponent': {
            StepsPanel: childrenOnly,
            default: ({ steps }) => React.createElement('ol', null, steps.map(step =>
                React.createElement('li', { key: step.index, 'data-status': step.status }, step.name,
                    step.explorerUrl && React.createElement('a', { href: step.explorerUrl, 'aria-label': 'View transaction' })))),
        },
    };
    const workflow = loadSource(`${withdraw}Presentation/DepositWorkflowView.tsx`, {
        ...shared,
        '../Processing/StepTransactionLink': { StepTransactionLink: empty },
    });
    const { ProcessingView } = loadSource(`${withdraw}Presentation/ProcessingView.tsx`, {
        ...shared,
        '@layerswap/widget-types': widgetTypes,
        '@/Models/RangeError': rangeErrors,
        '@/lib/address/explorerUrl': loadSource('lib/address/explorerUrl.ts'),
        '@/components/utils/ShortenString': { default: value => value },
        'lucide-react': { CircleCheck: empty, Undo2: empty },
        './DepositWorkflowView': workflow,
    });
    const pollingPolicy = loadSource('lib/swapPollingPolicy.ts', {
        '@layerswap/widget-types': widgetTypes,
        '@/components/utils/formatTime': formatTime,
    });
    const polling = loadSource('hooks/useSwapPolling.ts', {
        swr: { default: useSWR },
        '@/lib/apiClients/layerSwapApiClient': api,
        '@/lib/swapPollingPolicy': pollingPolicy,
    });
    const context = loadSource('context/swap.tsx', {
        '@/hooks/useSwapPolling': polling,
        '@/hooks/useSwapStatusNotification': { useSwapStatusNotification: noop },
        '@/hooks/useGaslessAuthorization': { useGaslessAuthorization: () => ({}) },
        './depositSettings': { useDepositSettings: () => ({}) },
        '@/lib/swapLifecycle': {},
        '@/lib/swapCreation': {},
        ...walletHooks,
        '@/lib/apiClients/layerSwapApiClient': api,
        '@/components/utils/resolveSwapPhase': phases,
        swr: { default: useSWR },
        './settings': { useInitialSettings: () => ({ swapId: 'first' }), useSettingsState: () => ({ networks: [network] }) },
        './swapAccounts': { useSelectedAccount: () => undefined },
        './callbackProvider': { useCallbacks: () => ({}) },
        '@/hooks/useFee': { transformSwapDataToQuoteArgs: noop, useQuoteData: () => ({}) },
        '@/stores/recentRoutesStore': { useRecentNetworksStore: () => noop },
        '@/stores/slippageStore': {},
        '@/lib/address/Address': {},
        '@/stores': {
            useSwapTransactionStore: selector => selector({ swapTransactions: {} }),
            useGaslessAuthorizationStore: selector => selector({ authorizations: {} }),
        },
        '@/stores/contractAddressStore': { useContractAddressStore: () => ({}) },
        '@/hooks/useExtendedSwapDisplay': { useExtendedSwapData: noop },
        '@/stores/gaslessPreferenceStore': { useGaslessPreferenceStore },
        '@/helpers/gasless': gasless,
        '@/lib/extendedRoutes/registry': {},
        '@/lib/extendedRoutes/transforms': {},
        '@/stores/extendedRoutesStore': {},
        '@/helpers/swapFlow': loadSource('helpers/swapFlow.ts'),
        '@/lib/swapPollingPolicy': pollingPolicy,
        '@layerswap/utils': {},
    });
    const harness = { Provider: context.SwapDataProvider };
    harness.Completion = function Completion() {
        harness.state = context.useSwapDataState();
        harness.update = context.useSwapDataUpdate();
        const { swapBasicData, swapDetails, depositActionsResponse } = harness.state;
        return swapDetails && React.createElement(ProcessingView, {
            swapBasicData, swapDetails, depositActions: depositActionsResponse,
            resolved: harness.state.resolved,
            transactionHash: swapDetails.transactions.find(tx => tx.type === 'input')?.transaction_hash,
        });
    };
    return harness;
}

for (const cachedDetails of [false, true]) {
    test(`completed swaps load workflow history without initialSwapData (${cachedDetails ? 'cached' : 'uncached'} details)`, async t => {
        t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
        const root = createRoot(container);
        const detailsKey = id => `/swaps/${id}?exclude_deposit_actions=true`;
        const actionsKey = id => `/swaps/${id}/deposit_actions`;
        const detailsFor = id => ({ data: { swap: {
            id, status: 'completed', requested_amount: 100,
            source_network: network, destination_network: network,
            source_token: { ...token, asset: 'USDC' },
            destination_token: { asset: 'ETH', decimals: 18 },
            use_deposit_address: false,
            transactions: [
                { type: 'input', status: 'completed', transaction_hash: '0xinput', confirmations: 1, max_confirmations: 1 },
                { type: 'output', status: 'completed', transaction_hash: '0xoutput', amount: 0.05 },
            ],
        } } });
        const firstActions = ['approve_permit2', 'sign', 'publish'].map(step => ({ step, status: 'completed' }));
        const secondActions = [{ step: 'publish', status: 'completed' }];
        let finishSecondActions;
        const secondResponse = new Promise(resolve => { finishSecondActions = resolve; });
        const requests = [];
        const harness = createSwapHistoryHarness(async key => {
            requests.push(key);
            if (key === actionsKey('first')) return { data: firstActions };
            if (key === actionsKey('second')) return secondResponse;
            if (key === detailsKey('first')) return detailsFor('first');
            if (key === detailsKey('second')) return detailsFor('second');
            assert.fail(`Unexpected request: ${key}`);
        });
        const cache = new Map([[detailsKey('second'), { data: detailsFor('second') }]]);
        if (cachedDetails) cache.set(detailsKey('first'), { data: detailsFor('first') });
        let onFocus;
        let onReconnect;
        const config = {
            provider: () => cache, dedupingInterval: 0, focusThrottleInterval: 0,
            initFocus: callback => { onFocus = callback; return noop; },
            initReconnect: callback => { onReconnect = callback; return noop; },
        };
        const steps = () => [...container.querySelectorAll('li')].map(node => node.textContent);
        const actionRequests = () => requests.filter(key => key.includes('/deposit_actions'));
        try {
            await act(async () => root.render(React.createElement(SWRConfig, { value: config },
                React.createElement(harness.Provider, null, React.createElement(harness.Completion)))));
            assert.deepEqual(steps(), ['Approve token', 'Sign to swap', 'Confirm swap', 'Received 0.05 ETH']);
            assert.ok([...container.querySelectorAll('li')].every(node => node.dataset.status === 'complete'));
            assert.deepEqual(actionRequests(), [actionsKey('first')]);

            await act(async () => { t.mock.timers.tick(1000); onFocus(); onReconnect(); });
            assert.deepEqual(actionRequests(), [actionsKey('first')], 'completed history does not revalidate on focus/reconnect');

            await act(async () => harness.update.setSwapId('second'));
            assert.equal(harness.state.depositActionsResponse, undefined, 'pending history cannot leak from the previous swap');
            assert.deepEqual(steps(), ['Deposit confirmed', '0.05 ETH was sent to your address'], 'receipts remain visible while wallet history loads');
            await act(async () => { finishSecondActions({ data: secondActions }); await secondResponse; });
            assert.deepEqual(steps(), ['Confirm swap', 'Received 0.05 ETH']);

            await act(async () => harness.update.setSwapId('first'));
            await act(async () => { t.mock.timers.tick(1000); });
            assert.deepEqual(steps(), ['Approve token', 'Sign to swap', 'Confirm swap', 'Received 0.05 ETH']);
            assert.deepEqual(actionRequests(), [actionsKey('first'), actionsKey('second')], 'reopening a swap reuses its cached history');
        } finally {
            finishSecondActions({ data: secondActions });
            await act(() => root.unmount());
            t.mock.timers.reset();
        }
    });
}

test('a real atomic swap keeps its receipts without completion time when the API returns only a sign action', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const root = createRoot(container);
    const route = { ...network, transaction_explorer_template: 'https://basescan.example.invalid/tx/{0}' };
    const response = { data: { swap: {
        id: 'first', status: 'completed', requested_amount: 3.177233,
        source_network: route, destination_network: route,
        source_token: { ...token, asset: 'USDC', decimals: 6, precision: 6 },
        destination_token: { asset: 'USDe', symbol: 'USDe', decimals: 18, precision: 6 },
        use_deposit_address: false,
        transactions: [
            { type: 'input', status: 'completed', transaction_hash: '0xatomic', confirmations: 1, max_confirmations: 1, timestamp: '2026-09-25T10:00:00Z' },
            { type: 'output', status: 'completed', transaction_hash: '0xatomic', amount: 3.169000329540956, timestamp: '2026-09-25T10:00:00Z' },
        ],
    } } };
    let finishActions;
    const actions = new Promise(resolve => { finishActions = resolve; });
    const harness = createSwapHistoryHarness(async key => {
        if (key === '/swaps/first?exclude_deposit_actions=true') return response;
        if (key === '/swaps/first/deposit_actions') return actions;
        assert.fail(`Unexpected request: ${key}`);
    });
    const cache = new Map();
    const config = { provider: () => cache, dedupingInterval: 0 };
    const assertReceipt = () => {
        assert.match(container.textContent, /Transfer complete/);
        assert.doesNotMatch(container.textContent, /Completed in/);
        const rows = [...container.querySelectorAll('li')];
        assert.deepEqual(rows.map(row => row.textContent), ['Deposit confirmed', '3.169 USDe was sent to your address']);
        assert.ok(rows.every(row => row.dataset.status === 'complete'));
        assert.deepEqual(rows.map(row => row.querySelector('a').href), [
            'https://basescan.example.invalid/tx/0xatomic',
            'https://basescan.example.invalid/tx/0xatomic',
        ]);
    };
    try {
        await act(async () => root.render(React.createElement(SWRConfig, { value: config },
            React.createElement(harness.Provider, null, React.createElement(harness.Completion)))));
        assertReceipt();
        await act(async () => {
            finishActions({ data: [{ type: 'sign', step: 'sign', status: 'completed' }] });
            await actions;
        });
        assert.equal(harness.state.depositActionsResponse.length, 1);
        assertReceipt();
        assert.doesNotMatch(container.textContent, /Sign to swap|Confirm swap/);
    } finally {
        finishActions({ data: [] });
        await act(() => root.unmount());
        t.mock.timers.reset();
    }
});

test.after(() => dom.window.close());
