import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import ts from 'typescript';

const req = createRequire(import.meta.url);
const core = new URL('../../../packages/widget/core/src/', import.meta.url);
const coreReq = createRequire(new URL('../package.json', core));

// Keep the real gas cache, transition and wallet execution controller. Replace
// external contexts/services and hold the wallet and exact fee requests open.
function loadSource(path, imports = {}) {
    const { outputText } = ts.transpileModule(
        readFileSync(new URL(path, core), 'utf8'),
        {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2022,
                jsx: ts.JsxEmit.ReactJSX,
            },
        },
    );
    const module = { exports: {} };
    new Function('require', 'module', 'exports', outputText)(
        (name) => {
            if (name === 'react' || name === 'react/jsx-runtime')
                return req(name);
            if (name in imports) return imports[name];
            throw new Error(`Unexpected dependency: ${name} at ${path}`);
        },
        module,
        module.exports,
    );
    return module.exports;
}

test('exact gas loading preserves the pending wallet request and its execution lock', async () => {
    const dom = new JSDOM('<div id="root"></div>', {
        pretendToBeVisual: true,
        url: 'https://widget.example.invalid',
    });
    const globals = Object.fromEntries(
        [
            'window',
            'document',
            'HTMLElement',
            'Element',
            'SVGElement',
            'Node',
            'getComputedStyle',
            'localStorage',
        ].map((key) => [key, dom.window[key]]),
    );
    Object.assign(globals, {
        requestAnimationFrame: dom.window.requestAnimationFrame.bind(
            dom.window,
        ),
        cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
        IS_REACT_ACT_ENVIRONMENT: true,
    });
    const previousGlobals = Object.getOwnPropertyDescriptors(globalThis);
    for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, {
            configurable: true,
            writable: true,
            value,
        });
    }
    dom.window.matchMedia = () => ({
        matches: false,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
    });
    const { default: useSWR, SWRConfig, useSWRConfig } = coreReq('swr');
    const noop = () => {};
    const childrenOnly = ({ children }) =>
        React.createElement(React.Fragment, null, children);
    const base = 'components/Pages/Swap/Withdraw/';
    const token = { symbol: 'ETH', decimals: 18, precision: 6 };
    const network = {
        name: 'BASE_MAINNET',
        type: 'evm',
        chain_id: '8453',
        token,
    };
    const wallet = {
        id: 'wallet',
        address: 'source',
        isActive: true,
        asSourceSupportedNetworks: [network.name],
    };
    const account = { id: wallet.id, address: wallet.address, provider: {} };
    const state = {
        swapBasicData: {
            source_network: network,
            source_token: token,
            destination_network: network,
            destination_token: token,
            destination_address: 'destination',
            requested_amount: '0.95',
            use_deposit_address: false,
        },
        setSwapError: noop,
    };
    const action = {
        type: 'transfer',
        to_address: 'deposit',
        amount: 0.95,
        call_data: '0x',
        network,
        token,
        status: 'action_required',
    };
    let rerender, view;
    const walletRequest = Promise.withResolvers();
    const exactEstimate = Promise.withResolvers();
    let mounts = 0,
        unmounts = 0,
        signals = [],
        requests = [];
    const helpers = loadSource('helpers/depositActions.ts');
    const pendingGas = exactEstimate.promise;
    const { default: realGasHook } = loadSource('lib/gases/useSWRGas.tsx', {
        swr: { default: useSWR },
        '../resolvers/resolverService': {
            resolverService: {
                getGasResolver: () => ({
                    getGas(args) {
                        requests.push(args);
                        return args.recipientAddress
                            ? pendingGas
                            : Promise.resolve({ gas: 0.1, token });
                    },
                }),
            },
        },
        '../../stores/balanceStore': {
            getKey: noop,
            useBalanceStore: (selector) => selector({ balances: {} }),
        },
    });
    const budget = loadSource('lib/gases/resolveGasBalanceBudget.ts');
    const { default: useOutOfGas } = loadSource('lib/gases/useOutOfGas.ts', {
        './useSWRGas': { default: realGasHook },
        './resolveGasBalanceBudget': budget,
    });
    const swapHooks = {
        useSwapDataState: () => state,
        useSwapDataUpdate: () => ({
            async createSwap() {
                return {
                    swap: {
                        ...state.swapBasicData,
                        id: 'swap',
                        metadata: {},
                        transactions: [],
                    },
                    deposit_actions: [action],
                    quote: {},
                };
            },
            setSwapId(id) {
                state.swapId = id;
                state.swapDetails = { id, metadata: {}, transactions: [] };
                state.depositActionsResponse = [action];
                rerender();
            },
            canAdjustAmount: () => true,
            acquireWalletExecution: () => noop,
            startFreshSwapAttempt: noop,
            markWalletExecutionStarted: noop,
            setQuoteLoading: noop,
            setSubmitedFormValues: noop,
        }),
    };
    const stores = {
        useSwapTransactionStore: (s) =>
            s({
                swapTransactions: {},
                stepTransactions: {},
                setSwapTransaction: noop,
            }),
        useGaslessAuthorizationStore: (s) => s({ authorizations: {} }),
        useDepositSignatureStore: (s) => s({ signatures: {} }),
    };
    const imports = {
        '@/lib/amountPresets': { AmountPresetChangedError: class extends Error {}, isAmountPreset: () => false },
        '@/lib/widgetTelemetry': { widgetTelemetry: { recordAmountInput: noop } },
        '@layerswap/wallet-core': loadSource('../../../wallets/core/src/lib/walletConnect/walletRequestStore.ts'),
        '../../Presentation/WalletRequestRecovery': { WalletRequestRecovery: () => null },
        '@/context/swap': swapHooks,
        '@/context/settings': {
            useSettingsState: () => ({ networks: [network] }),
            useInitialSettings: () => ({}),
        },
        '@/context/swapAccounts': { useSelectedAccount: () => account },
        '@/hooks/useWallet': { default: () => ({ wallets: [wallet] }) },
        '@/lib/balances/useBalance': {
            useBalance: () => ({
                balances: [
                    {
                        network: network.name,
                        token: token.symbol,
                        amount: 1,
                        isNativeCurrency: true,
                    },
                ],
                mutate: noop,
            }),
        },
        '@/lib/gases/useSWRGas': { default: realGasHook },
        '@/hooks/useTransferBlocked': { useTransferBlocked: noop },
        '@/lib/swapLifecycle': { lifecycleContextFromSwap: () => ({}) },
    };
    const { SendTransactionButton } = loadSource(
        base + 'Wallet/Common/buttons.tsx',
        {
            ...imports,
            '@/context/callbackProvider': {
                useCallbacks: () => ({ onSwapLifecycle: noop }),
            },
            '@/hooks/useClientLayoutEffect': {
                useClientLayoutEffect: React.useLayoutEffect,
            },
            '@/hooks/useDepositActionPolling': {
                depositActionsKey: (id, addr) => `/${id}/${addr}`,
                useDepositActionPolling: () => ({
                    data: state.depositActionsResponse,
                    refresh: async () => [action],
                }),
            },
            '@/helpers/swapProgress': { hasSwapExecutionProgress: () => false },
            '@/helpers/gasless': {
                isGaslessCapableRoute: () => false,
                isGaslessDepositWorkflow: () => false,
            },
            '@/helpers/depositActions': helpers,
            './isUserRejection': { isUserRejection: () => false },
            './ensureSourceChain': {
                ensureSourceChain: async () => {},
                NetworkSwitchError: class extends Error {},
            },
            swr: { useSWRConfig },
            '@/components/utils/numbers': { isDiffByPercent: () => false },
            '@/components/Wallet/WalletModal': { useConnectModal: () => ({}) },
            '@/context/depositSettings': { useDepositSettings: () => ({}) },
            '@/context/withdrawalContext': {
                useWalletWithdrawalState: () => ({}),
            },
            '@/lib/apiClients/layerSwapApiClient': { default: class {} },
            '@/lib/ErrorHandler': { ErrorHandler: noop },
            '@/lib/fees': { resolvePriceImpactValues: noop },
            '@/stores/gaslessPreferenceStore': {
                useGaslessPreferenceStore: (s) =>
                    s({ gaslessEnabled: false, gaslessUnavailable: false }),
            },
            '@/stores/swapTransactionStore': stores,
            '@layerswap/utils': { sleep: noop },
            '../../Presentation/WalletActionsView': {
                SendTransactionView: (props) => {
                    view = props;
                    return React.createElement(
                        'button',
                        { disabled: props.loading, onClick: props.handleClick },
                        props.loading ? 'Waiting wallet' : 'Send',
                    );
                },
            },
            './depositExecution': {
                ...helpers,
                executeWalletTransfer: async (ctx, onClick, a) => {
                    signals.push(ctx.signal);
                    return onClick(a);
                },
            },
        },
    );
    function WalletController({ swapBasicData, warning }) {
        React.useEffect(() => {
            mounts++;
            return () => {
                unmounts++;
            };
        }, []);
        return React.createElement(
            React.Fragment,
            null,
            warning,
            React.createElement(SendTransactionButton, {
                swapData: swapBasicData,
                refuel: false,
                onClick: () => walletRequest.promise,
            }),
        );
    }
    const motionModule = coreReq('framer-motion');
    const hydrated = loadSource('../../../ui-kit/src/lib/useHydratedReducedMotion.ts', {
        'framer-motion': motionModule,
    });
    const transition = loadSource(
        base + 'Presentation/WalletActionTransition.tsx',
        {
            'framer-motion': motionModule,
            '@layerswap/ui-kit': hydrated,
        },
    );
    const decimals = loadSource('../../../utils/src/truncateDecimals.ts');
    const { default: Withdraw } = loadSource(base + 'Withdraw.tsx', {
        ...imports,
        '@layerswap/utils': decimals,
        '@/components/Widget/Index': { Widget: { Footer: childrenOnly } },
        '@/helpers/swapFlow': { isDepositAddressSwap: () => false },
        '@/hooks/useFee': {
            transformSwapDataToQuoteArgs: noop,
            useQuoteData: () => ({
                minAllowedAmount: 0.001,
                maxAllowedAmount: 10,
            }),
        },
        '@/lib/gases/useOutOfGas': { default: useOutOfGas },
        '@/components/Input/Amount/helpers': loadSource(
            'components/Input/Amount/helpers.ts',
            {
                '@layerswap/utils': decimals,
                '@/lib/gases/resolveGasBalanceBudget': budget,
            },
        ),
        '@layerswap/widget-types': { NetworkType: { EVM: 'evm' } },
        formik: { useFormikContext: () => ({ values: {}, setValues: noop }) },
        '../Form/SecondaryComponents/validationError/AdjustAmountButton': {
            AdjustAmountButton: () =>
                React.createElement('div', null, 'Adjust amount'),
        },
        '../Form/SecondaryComponents/validationError/RefreshBalanceButton': {
            RefreshBalanceButton: () => null,
        },
        './Presentation/BalanceWarningView': {
            GasWarningView: () =>
                React.createElement('div', { 'data-warning': true }, 'Warning'),
        },
        './WalletTransferButton': { default: WalletController },
        './Presentation/WalletActionTransition': transition,
        '@/hooks/useLifecycleObservation': { useLifecycleObservation: noop },
        '@/helpers/depositActions': helpers,
    });
    function Screen() {
        const [, set] = React.useState(0);
        rerender = () => set((x) => x + 1);
        return React.createElement(Withdraw, { type: 'contained' });
    }

    const root = createRoot(document.getElementById('root'));
    const swrOptions = {
        provider: () => new Map(),
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
    };
    const waitForExit = () =>
        act(() => new Promise((resolve) => setTimeout(resolve, 450)));
    const hasWarning = () => !!document.querySelector('[data-warning]');
    try {
        await act(async () =>
            root.render(
                React.createElement(
                    SWRConfig,
                    { value: swrOptions },
                    React.createElement(Screen),
                ),
            ),
        );
        await waitForExit();
        assert.equal(hasWarning(), true);
        const initialMounts = mounts;
        const initialUnmounts = unmounts;

        await act(async () => {
            view.handleClick();
        });
        assert.equal(
            requests.filter((request) => request.recipientAddress).length,
            1,
        );
        assert.equal(signals.length, 1);
        assert.equal(view.loading, true);
        await waitForExit();
        assert.equal(hasWarning(), false);
        assert.equal(signals[0].aborted, false);
        assert.equal(view.loading, true);
        assert.equal(mounts, initialMounts);
        assert.equal(unmounts, initialUnmounts);

        await act(async () => {
            view.handleClick();
        });
        assert.equal(
            signals.length,
            1,
            'a second click must not request another wallet transfer',
        );

        await act(async () => {
            exactEstimate.resolve({ gas: 0.1, token });
            await exactEstimate.promise;
        });
        await waitForExit();
        assert.equal(hasWarning(), true);
        assert.equal(signals[0].aborted, false);
        assert.equal(view.loading, true);
        assert.equal(mounts, initialMounts);
        assert.equal(unmounts, initialUnmounts);

        await act(async () => {
            walletRequest.resolve('0xpublished');
            await walletRequest.promise;
        });
        assert.equal(view.loading, false);
        assert.equal(signals.length, 1);
    } finally {
        await act(() => root.unmount());
        dom.window.close();
        for (const key of Object.keys(globals)) {
            if (previousGlobals[key])
                Object.defineProperty(globalThis, key, previousGlobals[key]);
            else delete globalThis[key];
        }
    }
});
