import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import ts from 'typescript';

// Exercise presence with motion enabled. The main timeline suite verifies
// reduced motion; it cannot catch controls unmounting before their exit ends.
const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true });
for (const name of ['window', 'document', 'HTMLElement', 'Element', 'SVGElement', 'Node', 'getComputedStyle', 'customElements']) {
    globalThis[name] = dom.window[name];
}
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
dom.window.scrollTo = () => {};
const measurements = new Map();
globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; }
    observe(node) { measurements.set(this, node); }
    disconnect() { measurements.delete(this); }
};

const directory = dirname(fileURLToPath(import.meta.url));
const widgetRequire = createRequire(new URL('../../../packages/widget/core/package.json', import.meta.url));
assert.equal(widgetRequire('framer-motion/package.json').version, '12.34.5');
const temporary = mkdtempSync(join(directory, '.timeline-motion-'));
process.on('exit', () => rmSync(temporary, { recursive: true, force: true }));
const outfile = join(temporary, 'motion.mjs');
await build({
    stdin: {
        contents: `
            export { SwapContentView, ProcessingSectionView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/Page2Sections.js';
            export { StepsPanel } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Processing/StepsComponent.js';
            export { default as Steps } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Processing/StepsComponent.js';
            export { TransferStatusHeader } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/TransferStatusHeader.js';
            export { QuoteView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/QuoteView.js';
            export { QuoteSummaryView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/QuoteSummaryView.js';
            export { DepositWorkflowView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/DepositWorkflowView.js';
            export { WalletExecutionTransition } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletExecutionTransition.js';
            export { WalletActionTransition } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletActionTransition.js';
            export { SendTransactionView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletActionsView.js';
            export { RetryView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/RetryView.js';
            export { DepositLayoutView } from '../../packages/widget/core/dist/esm/components/Pages/Deposit/DepositLayoutView.js';
            export { DepositAddressTransition } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Form/DepositAddressForm/DepositAddressTransition.js';
        `,
        resolveDir: join(directory, '..'),
        loader: 'tsx',
    },
    outfile,
    platform: 'node',
    format: 'esm',
    bundle: true,
    external: ['react', 'react-dom', 'react-dom/*'],
    plugins: [{
        name: 'widget-motion',
        setup(builder) {
            builder.onResolve({ filter: /^framer-motion$/ }, () => ({
                path: widgetRequire.resolve('framer-motion'), external: true,
            }));
        },
    }],
    mainFields: ['module', 'main'],
    logLevel: 'silent',
});
const { SwapContentView, ProcessingSectionView, StepsPanel, Steps, TransferStatusHeader, QuoteView, QuoteSummaryView, DepositWorkflowView, WalletExecutionTransition, WalletActionTransition, SendTransactionView, RetryView, DepositLayoutView, DepositAddressTransition } = await import(pathToFileURL(outfile));
function loadWidgetSource(path, imports) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(`../../../packages/widget/core/src/${path}`, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    });
    const module = { exports: {} };
    new Function('require', 'module', 'exports', outputText)(name => {
        if (name === 'react' || name === 'react/jsx-runtime') return widgetRequire(name);
        if (name === '../components/utils/resolveSwapFlow.js') return loadWidgetSource('components/utils/resolveSwapFlow.ts', {});
        if (name in imports) return imports[name];
        throw new Error(`Unexpected dependency: ${name}`);
    }, module, module.exports);
    return module.exports;
}
const container = document.getElementById('root');
const settle = () => act(() => new Promise(resolve => setTimeout(resolve, 400)));
const view = (processing, manual = false) => React.createElement(SwapContentView, {
    summary: (!manual || processing) && React.createElement('div', null, 'Summary'),
    quote: !manual && React.createElement('div', null, 'Quote'),
    compactQuote: !manual && processing,
    transferStage: processing ? 'processing' : 'withdraw',
}, processing
    ? React.createElement(StepsPanel, null, 'Processing deposit')
    : React.createElement('button', null, 'Confirm in your wallet'));

test('standard transfer retains inert controls until their exit finishes alongside entering steps', async () => {
    const root = createRoot(container);
    try {
        await act(() => root.render(view(false)));
        const quote = container.querySelector('[data-quote-transition]');
        const controls = container.querySelector('[data-wallet-execution-panel="controls"]');
        await act(() => root.render(view(true)));
        assert.equal(container.querySelector('[data-quote-transition]'), quote);
        assert.equal(container.querySelector('[data-wallet-execution-panel="controls"]'), controls);
        assert.ok(controls.hasAttribute('inert'));
        assert.equal(controls.getAttribute('aria-hidden'), 'true');
        const steps = container.querySelector('[data-steps-panel]');
        assert.ok(steps);
        await settle();
        assert.equal(container.querySelector('[data-wallet-execution-panel="controls"]'), null);
        assert.equal(container.querySelector('[data-steps-panel]'), steps);
        assert.equal(steps.style.opacity, '1');
        await act(() => root.render(view(false)));
        assert.equal(container.querySelector('[data-steps-panel]'), steps);
        assert.ok(steps.closest('[inert]'));
        await settle();
        assert.equal(container.querySelector('[data-steps-panel]'), null);
        assert.equal(container.querySelector('[data-quote-transition]'), quote);
        assert.equal(container.querySelector('button').closest('[inert]'), null);
    } finally {
        await act(() => root.unmount());
    }
});

test('reversing an unfinished standard transfer transition settles on the latest stage', async () => {
    const root = createRoot(container);
    try {
        await act(() => root.render(view(false)));
        for (const processing of [true, false, true, false]) {
            await act(() => root.render(view(processing)));
        }
        await settle();
        assert.equal(container.querySelectorAll('button').length, 1);
        assert.equal(container.querySelector('button').closest('[inert]'), null);
        assert.equal(container.querySelector('[data-steps-panel]'), null);
        assert.equal(container.querySelector('[data-quote-transition]').hasAttribute('inert'), false);
    } finally {
        await act(() => root.unmount());
    }
});

test('retry collapses failed-state actions with the steps and gives Swap now one entrance animation', async () => {
    const root = createRoot(container);
    const scene = (failed) => React.createElement(SwapContentView, {
        summary: React.createElement('div', null, 'Summary'),
        quote: React.createElement('div', null, 'Quote'),
        compactQuote: failed,
        transferStage: failed ? 'processing' : 'withdraw',
    }, failed
        ? React.createElement(ProcessingSectionView, { actions: React.createElement(RetryView) },
            React.createElement(StepsPanel, null, 'The transfer failed'))
        : React.createElement(WalletActionTransition, { actionKey: 'transfer' },
            React.createElement(SendTransactionView)));
    try {
        await act(() => root.render(scene(true)));
        const actions = container.querySelector('[data-processing-actions]');
        assert.ok(actions, 'retry controls have their own collapsible region');
        const quote = container.querySelector('[data-quote-transition]');
        const retryButton = actions.querySelector('button');

        await act(() => {
            flushSync(() => root.render(scene(false)));
            const controls = container.querySelector('[data-wallet-execution-panel="controls"]');
            assert.equal(controls.style.opacity, '0', 'the outer controls own the entrance');
            const walletAction = controls.querySelector('[style*="transform"]');
            assert.equal(walletAction.style.transform, 'none', 'no second slide under the height animation');
            assert.equal(walletAction.style.opacity, '1');
        });
        assert.equal(actions.querySelector('button'), retryButton, 'outgoing retry remains mounted for its exit');
        assert.ok(actions.hasAttribute('inert'));
        assert.equal(actions.getAttribute('aria-hidden'), 'true');
        assert.equal(container.querySelector('[data-quote-transition]'), quote);
        await act(() => new Promise(resolve => setTimeout(resolve, 100)));
        assert.ok(Number(actions.style.opacity) < 1, 'retry controls fade out with the steps');
        assert.notEqual(actions.style.height, 'auto', 'retry controls collapse rather than leaving their height until unmount');

        await settle();
        assert.equal(container.querySelector('[data-processing-actions]'), null);
        assert.equal(container.querySelector('[data-steps-panel]'), null);
        assert.deepEqual([...container.querySelectorAll('button')].map(button => button.textContent), ['Swap now']);
        assert.equal(container.querySelector('button').closest('[inert]'), null);

        for (const failed of [true, false, true, false]) {
            await act(() => root.render(scene(failed)));
        }
        await settle();
        assert.equal(container.querySelector('[data-processing-actions]'), null);
        assert.deepEqual([...container.querySelectorAll('button')].map(button => button.textContent), ['Swap now']);
    } finally {
        await act(() => root.unmount());
    }
});

test('manual deposit animates summary entry and retains instructions through their exit and rewind', async () => {
    const root = createRoot(container);
    try {
        await act(() => root.render(view(false, true)));
        assert.equal(container.querySelector('[data-wallet-execution-panel="overview"]'), null);
        const controls = container.querySelector('[data-wallet-execution-panel="controls"]');

        await act(() => root.render(view(true, true)));
        const overview = container.querySelector('[data-wallet-execution-panel="overview"]');
        const steps = container.querySelector('[data-steps-panel]');
        assert.ok(overview);
        assert.ok(steps);
        assert.equal(container.querySelector('[data-wallet-execution-panel="controls"]'), controls);
        assert.ok(controls.hasAttribute('inert'));
        await settle();
        assert.equal(container.querySelector('[data-wallet-execution-panel="controls"]'), null);
        assert.equal(overview.style.opacity, '1');

        await act(() => root.render(view(false, true)));
        assert.equal(container.querySelector('[data-wallet-execution-panel="overview"]'), overview);
        assert.ok(overview.hasAttribute('inert'));
        assert.ok(steps.closest('[inert]'));
        await settle();
        assert.equal(container.querySelector('[data-wallet-execution-panel="overview"]'), null);
        assert.equal(container.querySelector('[data-steps-panel]'), null);
        assert.equal(container.querySelector('button').closest('[inert]'), null);

        for (const processing of [true, false, true]) {
            await act(() => root.render(view(processing, true)));
        }
        await settle();
        assert.equal(container.querySelectorAll('[data-wallet-execution-panel="overview"]').length, 1);
        assert.equal(container.querySelectorAll('[data-steps-panel]').length, 1);
        assert.equal(container.querySelector('[data-wallet-execution-panel="controls"]'), null);
    } finally {
        await act(() => root.unmount());
    }
});

test('wallet confirmation hands off to transaction confirmation without replaying the steps entrance', async () => {
    const root = createRoot(container);
    const actions = [
        { step: 'approve_permit2', status: 'completed' },
        { step: 'sign', status: 'completed' },
        { step: 'publish', status: 'action_required' },
    ];
    const common = { actions, destinationToken: { asset: 'ETH', decimals: 18 }, receiveAmount: 0.0396 };
    function WalletController({ ready }) {
        return React.createElement(WalletExecutionTransition, {
            workflow: !ready && React.createElement(DepositWorkflowView, {
                ...common, loading: true, actionStateText: 'Confirm in your wallet',
            }),
            controls: ready && React.createElement('button', null, 'Preparing swap'),
        });
    }
    function ProcessingController() {
        return React.createElement('div', null, React.createElement(DepositWorkflowView, {
            ...common,
            processing: { title: 'Transfer in progress', inputStatus: 'current', outputStatus: 'upcoming', inputDescription: 'Confirming transaction · no action needed' },
        }));
    }
    const scene = stage => React.createElement(React.StrictMode, null,
        React.createElement(SwapContentView, { summary: React.createElement('div', null, 'Summary') },
            stage === 'processing' ? React.createElement(ProcessingController) : React.createElement(WalletController, { ready: stage === 'ready' })));
    try {
        await act(() => root.render(scene('ready')));
        await act(() => {
            flushSync(() => root.render(scene('wallet')));
            assert.equal(container.querySelector('[data-steps-panel]').style.opacity, '0', 'the actual first appearance still animates');
        });
        await settle();
        assert.match(container.textContent, /Confirm in your wallet/);

        await act(() => root.render(scene('processing')));
        let panel = container.querySelector('[data-steps-panel]');
        assert.equal(panel.style.height, 'auto', 'a controller handoff must not collapse an already visible panel');
        assert.equal(panel.style.opacity, '1', 'a controller handoff must not fade the panel in again');
        assert.match(panel.textContent, /Confirming transaction · no action needed/);
        assert.equal(container.querySelectorAll('[data-steps-panel]').length, 1);

        await act(() => root.render(scene('wallet')));
        panel = container.querySelector('[data-steps-panel]');
        assert.equal(panel.style.height, 'auto');
        assert.equal(panel.style.opacity, '1');
        await act(() => root.render(scene('ready')));
        await settle();
        assert.equal(container.querySelector('[data-steps-panel]'), null);
        await act(() => {
            flushSync(() => root.render(scene('wallet')));
            assert.equal(container.querySelector('[data-steps-panel]').style.opacity, '0', 'returning after the panel disappeared restores its entrance');
        });
        await settle();
    } finally {
        await act(() => root.unmount());
    }
});

test('live token-swap handoff stays visible when submission resets the form gasless preference', async () => {
    const noop = () => {};
    const empty = () => null;
    const childrenOnly = ({ children }) => children;
    const destinationToken = { asset: 'USDe', decimals: 18 };
    const context = {
        swapBasicData: {
            source_network: { name: 'BASE_MAINNET' }, destination_network: { name: 'BASE_MAINNET' },
            use_deposit_address: false,
        },
        walletExecutionStarted: true,
        depositActionsResponse: [
            { step: 'sign', status: 'completed' },
            { step: 'publish', status: 'action_required' },
        ],
    };
    let gaslessActive = false;
    let showWithdrawScreen = true;
    const { resolveSwapFlow } = loadWidgetSource('components/utils/resolveSwapFlow.ts', {});
    const common = { actions: context.depositActionsResponse, destinationToken, receiveAmount: 2.652761339210903 };
    const { default: SwapDetails } = loadWidgetSource('components/Pages/Swap/Withdraw/SwapDetails.tsx', {
        './Presentation/Page2Sections': { SwapContentView, ProcessingSectionView },
        '@/helpers/swapFlow': loadWidgetSource('helpers/swapFlow.ts', {}),
        '@/helpers/gasless': loadWidgetSource('helpers/gasless.ts', {}),
        '@/hooks/useIsGaslessActive': { useIsGaslessActive: () => gaslessActive },
        './Summary': { default: () => React.createElement('div', null, 'USDC → USDe') },
        './SwapQuoteDetails': { SwapQuoteDetails: () => React.createElement('div', null, 'Receive at least') },
        './Presentation/Page2Contained': { Page2Contained: childrenOnly },
        '@/components/Common/Sceletons': { SwapDetailsSceleton: empty },
        '@/components/Widget/Index': { Widget: childrenOnly },
        '@/context/callbackProvider': { useCallbacks: () => ({ onBackClick: noop, onSwapLifecycle: noop }) },
        '@/context/swap': { useSwapDataState: () => ({ ...context, flow: resolveSwapFlow({ swapData: context.swapBasicData, depositActions: context.depositActionsResponse, walletExecutionStarted: context.walletExecutionStarted, resolved: { showWithdrawScreen } }) }), useSwapDataUpdate: () => ({ setSwapViewMounted: noop }) },
        '@/context/swapAccounts': { useSelectedAccount: () => ({ address: '0xsource' }) },
        '@/hooks/useGaslessAuthorizationStatus': { useGaslessAuthorizationStatus: noop },
        '@/hooks/useResolvedSwapStatus': { useResolvedSwapStatus: () => ({ showWithdrawScreen }) },
        '@/hooks/useSwapRetry': { useSwapRetry: () => ({}) },
        '@/lib/swapLifecycle': {},
        './ManualWithdraw': { default: empty },
        './Presentation/RetryView': { RetryView },
        './Withdraw': { default: () => React.createElement(SendTransactionView, {
            loading: true, depositActions: context.depositActionsResponse,
            quote: { destination_token: destinationToken, receive_amount: common.receiveAmount },
            actionStateText: 'Confirm in your wallet',
        }) },
        './Processing': { default: () => React.createElement(DepositWorkflowView, {
            ...common,
            processing: { inputStatus: 'current', outputStatus: 'upcoming', inputDescription: 'Confirming transaction' },
        }) },
    });
    const root = createRoot(container);
    const scene = () => React.createElement(React.StrictMode, null, React.createElement(SwapDetails, { type: 'contained' }));
    try {
        await act(() => root.render(scene()));
        await settle();
        assert.match(container.textContent, /Confirm in your wallet/);
        const outerSlot = container.querySelector('[data-quote-layout]').closest('[style*="opacity"]').nextElementSibling;

        // FormWrapper.onWalletWithdrawalSuccess resets this preference before the
        // transaction store switches SwapDetails from Withdraw to Processing.
        gaslessActive = true;
        context.walletExecutionStarted = false;
        showWithdrawScreen = false;
        await act(() => {
            flushSync(() => root.render(scene()));
            const panels = [...container.querySelectorAll('[data-steps-panel]')].filter(panel => !panel.closest('[inert]'));
            assert.equal(panels.length, 1);
            assert.equal(panels[0].style.height, 'auto', 'the existing progress must not collapse and re-enter on submission');
            assert.equal(panels[0].style.opacity, '1');
            assert.ok(outerSlot.contains(panels[0]), 'processing remains in the same execution slot');
            assert.match(panels[0].textContent, /Confirming transaction/);
        });
        await settle();
        assert.equal(container.querySelectorAll('[data-steps-panel]').length, 1);
    } finally {
        await act(() => root.unmount());
    }
});

test('deposit screen height tweens in both directions without double-animating changes within a screen', async () => {
    const root = createRoot(container);
    const originalBounds = dom.window.HTMLElement.prototype.getBoundingClientRect;
    let measuredHeight = 400;
    dom.window.HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 472, bottom: measuredHeight, width: 472, height: measuredHeight });
    const scene = step => React.createElement(DepositLayoutView, {
        transitionKey: step,
        header: React.createElement('header', null, 'Deposit'),
        footer: React.createElement('footer', null, 'Layerswap'),
    }, React.createElement('div', null, step));
    const measure = height => {
        measuredHeight = height;
        for (const [observer, target] of measurements)
            observer.callback([{ target, borderBoxSize: [{ inlineSize: 472, blockSize: height }] }]);
    };
    try {
        await act(() => root.render(scene('methods')));
        const panel = container.querySelector('header').nextElementSibling.nextElementSibling;
        // JSDOM has no layout or default computed padding; Framer uses both
        // when resolving the initial auto height into pixels.
        panel.style.padding = '0px';
        await settle();
        await act(() => measure(400));
        await settle();
        assert.equal(panel.style.height, '400px');

        await act(() => root.render(scene('address')));
        await act(() => measure(600));
        await act(() => new Promise(resolve => setTimeout(resolve, 70)));
        assert.ok(parseFloat(panel.style.height) > 400 && parseFloat(panel.style.height) < 600, `screen entry should tween, got ${panel.style.height}`);
        await settle();
        assert.equal(panel.style.height, '600px');

        await act(() => measure(500));
        await act(() => new Promise(resolve => setTimeout(resolve, 40)));
        assert.equal(panel.style.height, '500px', 'in-screen quote changes track the content without a second tween');

        await act(() => root.render(scene('methods')));
        await act(() => measure(400));
        await act(() => new Promise(resolve => setTimeout(resolve, 70)));
        assert.ok(parseFloat(panel.style.height) > 400 && parseFloat(panel.style.height) < 500, `rewinding should tween, got ${panel.style.height}`);
        await settle();
        assert.equal(panel.style.height, '400px');
    } finally {
        await act(() => root.unmount());
        dom.window.HTMLElement.prototype.getBoundingClientRect = originalBounds;
    }
});

test('deposit details collapse while confirmation expands, and rewind restores the instructions', async () => {
    const root = createRoot(container);
    const scene = processing => React.createElement(DepositAddressTransition, {
        summary: processing && React.createElement('div', null, '100 USDC on Ethereum → 99 USDC on Base'),
        instructions: !processing && React.createElement('div', null,
            React.createElement('div', null, 'Deposit details · QR code · Minimum · Maximum · Fees'),
            React.createElement('button', null, 'Copy deposit address')),
        processing: processing && React.createElement(StepsPanel, null, 'Confirming deposit'),
    });
    try {
        await act(() => root.render(scene(false)));
        const details = container.querySelector('[data-wallet-execution-panel="controls"]');
        await act(() => root.render(scene(true)));
        assert.equal(container.querySelector('[data-wallet-execution-panel="controls"]'), details, 'keep the address and expanded details until their collapse finishes');
        assert.ok(details.hasAttribute('inert'));
        const summary = container.querySelector('[data-wallet-execution-panel="overview"]');
        assert.match(summary.textContent, /100 USDC on Ethereum/);
        const confirmation = container.querySelector('[data-steps-panel]');
        assert.ok(confirmation, 'confirmation enters alongside the collapsing details');
        await act(() => new Promise(resolve => setTimeout(resolve, 70)));
        assert.notEqual(details.style.height, 'auto');
        assert.ok(Number(details.style.opacity) < 1);
        await settle();
        assert.equal(container.querySelector('[data-wallet-execution-panel="controls"]'), null);
        assert.equal(container.querySelector('[data-steps-panel]'), confirmation);
        assert.equal(container.querySelector('[data-wallet-execution-panel="overview"]'), summary);
        assert.equal(summary.style.opacity, '1');

        await act(() => root.render(scene(false)));
        assert.ok(summary.hasAttribute('inert'));
        assert.equal(container.querySelector('[data-steps-panel]'), confirmation);
        assert.ok(confirmation.closest('[inert]'));
        await settle();
        assert.equal(container.querySelector('[data-steps-panel]'), null);
        assert.equal(container.querySelector('[data-wallet-execution-panel="overview"]'), null);
        assert.equal(container.querySelector('button').textContent, 'Copy deposit address');
        assert.equal(container.querySelector('button').closest('[inert]'), null);

        for (const processing of [true, false, true, false]) {
            await act(() => root.render(scene(processing)));
        }
        await settle();
        assert.equal(container.querySelectorAll('button').length, 1);
        assert.equal(container.querySelector('[data-steps-panel]'), null);
    } finally {
        await act(() => root.unmount());
    }
});

test('steps in a different execution slot enter while the outgoing panel collapses', async () => {
    const root = createRoot(container);
    const scene = processing => React.createElement(SwapContentView, {
        summary: React.createElement('div', null, 'Summary'),
        transferStage: processing ? 'processing' : 'withdraw',
    }, processing
        ? React.createElement(StepsPanel, { label: 'Processing' }, 'Confirming transfer')
        : React.createElement(WalletExecutionTransition, {
            workflow: React.createElement(StepsPanel, { label: 'Wallet' }, 'Confirm in your wallet'),
        }));
    try {
        await act(() => root.render(scene(false)));
        await settle();
        const outgoing = container.querySelector('[aria-label="Wallet"]');
        await act(() => {
            flushSync(() => root.render(scene(true)));
            const incoming = container.querySelector('[aria-label="Processing"]');
            assert.equal(incoming.style.opacity, '0', 'a sibling slot must not inherit visible-panel state');
            assert.equal(incoming.style.height, '0px');
        });
        assert.ok(outgoing.closest('[inert]'));
        await settle();
        assert.equal(container.querySelectorAll('[data-steps-panel]').length, 1);
        assert.equal(container.querySelector('[aria-label="Processing"]').style.opacity, '1');
        for (const processing of [false, true, false, true]) {
            await act(() => root.render(scene(processing)));
        }
        await settle();
        assert.equal(container.querySelectorAll('[data-steps-panel]').length, 1);
        assert.equal(container.querySelector('[data-steps-panel]').getAttribute('aria-label'), 'Processing');
    } finally {
        await act(() => root.unmount());
    }
});

test('retry controls exit when removed within the same processing section', async () => {
    const root = createRoot(container);
    const scene = retry => React.createElement(ProcessingSectionView, {
        actions: retry ? React.createElement(RetryView) : undefined,
    }, React.createElement(StepsPanel, null, 'Processing'));
    try {
        await act(() => root.render(scene(true)));
        const panel = container.querySelector('[data-steps-panel]');
        const actions = container.querySelector('[data-processing-actions]');
        await act(() => root.render(scene(false)));
        assert.equal(container.querySelector('[data-processing-actions]'), actions);
        assert.ok(actions.hasAttribute('inert'));
        assert.equal(actions.getAttribute('aria-hidden'), 'true');
        await act(() => new Promise(resolve => setTimeout(resolve, 80)));
        assert.ok(Number(actions.style.opacity) < 1);
        await settle();
        assert.equal(container.querySelector('[data-processing-actions]'), null);
        assert.equal(container.querySelector('[data-steps-panel]'), panel);
        for (const retry of [true, false, true]) await act(() => root.render(scene(retry)));
        await settle();
        assert.equal(container.querySelectorAll('[data-processing-actions]').length, 1);
        assert.equal(container.querySelector('[data-processing-actions]').hasAttribute('inert'), false);
    } finally {
        await act(() => root.unmount());
    }
});

test('a processing section without actions releases its execution slot on exit', async () => {
    const root = createRoot(container);
    const scene = processing => React.createElement(SwapContentView, {
        summary: React.createElement('div', null, 'Summary'),
        transferStage: processing ? 'processing' : 'withdraw',
    }, processing
        ? React.createElement(ProcessingSectionView, null,
            React.createElement(StepsPanel, null, 'Processing'))
        : React.createElement('button', null, 'Swap now'));
    try {
        await act(() => root.render(scene(true)));
        await act(() => root.render(scene(false)));
        await settle();
        assert.equal(container.querySelector('[data-steps-panel]'), null);
        assert.equal(container.querySelector('[data-wallet-execution-panel="workflow"]'), null);
    } finally {
        await act(() => root.unmount());
    }
});

test('heading swaps only on title changes and settles on the latest rapid update', async () => {
    const root = createRoot(container);
    const scene = (title, progress = 20) => React.createElement(TransferStatusHeader, {
        title, progress, description: React.createElement('time', null, '10s'),
    });
    try {
        await act(() => root.render(scene('Transfer in progress')));
        const initial = container.querySelector('[data-transfer-title] span');
        const gauge = container.querySelector('[role="progressbar"]');
        const elapsed = container.querySelector('time');
        assert.equal(initial.style.opacity, '1', 'initial heading appears immediately');
        await act(() => root.render(scene('Transfer in progress', 40)));
        assert.equal(container.querySelector('[data-transfer-title] span'), initial);
        assert.equal(initial.style.transform, 'none');
        await act(() => root.render(scene('Transfer complete', 100)));
        assert.equal(container.querySelector('[data-transfer-title]').textContent, 'Transfer in progress', 'retain outgoing text during exit');
        await act(() => root.render(scene('Refund pending', 40)));
        await act(() => root.render(scene('Refund sent', 100)));
        // Separate React commits for the exit completion and the entrance.
        await act(() => new Promise(resolve => setTimeout(resolve, 200)));
        await act(() => new Promise(resolve => setTimeout(resolve, 200)));
        const title = container.querySelector('[data-transfer-title]');
        assert.equal(title.textContent, 'Refund sent');
        assert.equal(title.children.length, 1);
        assert.equal(title.firstElementChild.style.opacity, '1');
        assert.equal(title.firstElementChild.style.filter, 'blur(0px)');
        assert.equal(container.querySelector('h3').getAttribute('aria-label'), 'Refund sent');
        assert.equal(container.querySelector('[role="progressbar"]'), gauge);
        assert.equal(container.querySelector('time'), elapsed);
        await act(() => root.render(scene('Transfer complete')));
        await act(() => root.render(scene('Refund sent')));
        await settle();
        assert.equal(title.textContent, 'Refund sent', 'returning to the exiting title restores it');
        assert.equal(title.firstElementChild.style.opacity, '1');
    } finally {
        await act(() => root.unmount());
    }
});

test('inserting approval and refund rows preserves transfer row identity', async () => {
    const root = createRoot(container);
    const input = { id: 'input_transfer', name: 'Deposit', status: 'current' };
    const output = { id: 'output_transfer', name: 'Receive', status: 'upcoming' };
    try {
        await act(() => root.render(React.createElement(Steps, { steps: [input, output] })));
        const row = container.querySelector('[data-status-step="input_transfer"]');
        assert.equal(row.getAttribute('aria-current'), 'step');
        await act(() => root.render(React.createElement(Steps, { steps: [
            { id: 'action:approve_permit2', name: 'Approve', status: 'complete' },
            { ...input, status: 'complete' },
            { ...output, status: 'failed' },
            { id: 'refund', name: 'Refund', status: 'current', isLoading: false },
        ] })));
        assert.equal(container.querySelector('[data-status-step="input_transfer"]'), row);
        assert.equal(row.hasAttribute('aria-current'), false);
        const waiting = container.querySelector('[data-status-step="refund"]');
        assert.equal(waiting.querySelector('.animate-spin'), null);
        assert.equal(waiting.querySelector('.step-label-shimmer'), null);
        await act(() => new Promise(resolve => setTimeout(resolve, 700)));
        assert.equal(row.querySelector('[style]').style.transform, 'none');
    } finally {
        await act(() => root.unmount());
    }
});

test('expanded quote details remain inert through their synchronized collapse', async () => {
    const root = createRoot(container);
    const scene = compact => React.createElement(QuoteView, {
        isOpen: true, compact,
        summary: React.createElement('div', null, 'Quote'),
        details: React.createElement('div', null, 'Expanded fees'),
    });
    try {
        await act(() => root.render(scene(false)));
        await settle();
        const details = container.querySelector('.AccordionContent');
        await act(() => root.render(scene(true)));
        assert.ok(details.hasAttribute('inert'));
        await act(() => new Promise(resolve => setTimeout(resolve, 180)));
        assert.match(details.textContent, /Expanded fees/, 'details must survive beyond the old 100ms exit');
        await settle();
        assert.equal(details.style.height, '0px');
        assert.equal(details.textContent, '');
    } finally {
        await act(() => root.unmount());
    }
});

test('compacting an expanded quote retains its summary contents when disclosure state resets', async () => {
    const root = createRoot(container);
    const scene = (compact, isOpen) => React.createElement(QuoteSummaryView, {
        compact, isOpen, quoteData: { quote: {} }, values: {}, showDestinationAddress: false,
        slippage: React.createElement('div', null, 'Slippage'),
        gasFee: React.createElement('div', { 'data-gas-row': true }, 'Gas fee'),
    });
    try {
        await act(() => root.render(scene(false, true)));
        const gasRow = container.querySelector('[data-gas-row]');
        const disclosure = container.querySelector('[data-page2-quote-disclosure]');
        await act(() => root.render(scene(true, false)));
        assert.equal(container.querySelector('[data-gas-row]'), gasRow);
        assert.ok(disclosure.parentElement.classList.contains('hidden'), 'the taller collapsed-summary row must not appear during compaction');
        assert.ok(disclosure.closest('[inert]'));
        await act(() => root.render(scene(false, false)));
        assert.equal(container.querySelector('[data-gas-row]'), null);
        assert.equal(disclosure.parentElement.classList.contains('hidden'), false);
        assert.equal(disclosure.closest('[inert]'), null);
    } finally {
        await act(() => root.unmount());
    }
});

test.after(() => dom.window.close());
