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
for (const name of ['window', 'document', 'HTMLElement', 'Element', 'SVGElement', 'Node', 'NodeList', 'getComputedStyle', 'customElements']) {
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
            export { Page2Presenter } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/Page2Presenter.js';
            export { getProcessingProgress } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/ProcessingView.js';
            export { ProcessingView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/ProcessingView.js';
            export { Page2Preview } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/Page2Preview.js';
            export { scenarios, EPOCH } from './features/timeline/fixtures.ts';
            export { resolveSwapPhase } from '../../packages/widget/core/dist/esm/components/utils/resolveSwapPhase.js';
            export { resolveSwapFlow } from '../../packages/widget/core/dist/esm/components/utils/resolveSwapFlow.js';
            export { default as Steps } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Processing/StepsComponent.js';
            export { TransferStatusHeader } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/TransferStatusHeader.js';
            export { QuoteView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/QuoteView.js';
            export { QuoteSummaryView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/QuoteSummaryView.js';
            export { DepositWorkflowView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/DepositWorkflowView.js';
            export { WalletExecutionTransition } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletExecutionTransition.js';
            export { WalletActionTransition } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletActionTransition.js';
            export { getSendTransactionPresentation, SendTransactionView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletActionsView.js';
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
    banner: { js: "import { createRequire as _createRequire } from 'node:module'; const require = _createRequire(import.meta.url);" },
    external: ['react', 'react-dom', 'react-dom/*', 'next/head', 'next/router'],
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
const { Page2Presenter, getProcessingProgress, getSendTransactionPresentation, SwapContentView, ProcessingSectionView, StepsPanel, ProcessingView, Page2Preview, scenarios, EPOCH, resolveSwapPhase, resolveSwapFlow, Steps, TransferStatusHeader, QuoteView, QuoteSummaryView, DepositWorkflowView, WalletExecutionTransition, WalletActionTransition, SendTransactionView, RetryView, DepositLayoutView, DepositAddressTransition } = await import(pathToFileURL(outfile));
function loadWidgetSource(path, imports) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(`../../../packages/widget/core/src/${path}`, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    });
    const module = { exports: {} };
    new Function('require', 'module', 'exports', outputText)(name => {
        if (name === 'react' || name === 'react/jsx-runtime') return widgetRequire(name);
        if (name === '../components/utils/resolveSwapFlow.js') return loadWidgetSource('components/utils/resolveSwapFlow.ts', {});
        if (path.endsWith('SwapDetails.tsx')) {
            if (name === './Page2Controller') return { Page2Controller: ({ children }) => children({ controls: imports['@/hooks/useResolvedSwapStatus'].useResolvedSwapStatus().showWithdrawScreen ? React.createElement(imports['./Withdraw'].default) : null }) };
            if (name === './Processing/Processing') return { useProcessingController: props => props };
            if (name === './Presentation/ProcessingView') return { getProcessingProgress: props => props };
            if (name === './Presentation/Page2Presenter') return { Page2Presenter: ({ controls, ...props }) => React.createElement(SwapContentView, { ...props, progress: React.createElement(imports['./Processing'].default) }, controls) };
        }
        if (name in imports) return imports[name];
        throw new Error(`Unexpected dependency: ${name}`);
    }, module, module.exports);
    return module.exports;
}
const container = document.getElementById('root');
const surface = node => node?.closest('[data-wallet-execution-panel="workflow"]') ?? node;
const settle = () => act(() => new Promise(resolve => setTimeout(resolve, 400)));
const view = (processing, manual = false) => React.createElement(SwapContentView, {
    summary: (!manual || processing) && React.createElement('div', null, 'Summary'),
    quote: !manual && React.createElement('div', null, 'Quote'),
    compactQuote: !manual && processing,
    stage: processing ? 'processing' : 'withdraw',
    progress: processing && React.createElement(StepsPanel, null, 'Processing deposit'),
}, !processing && React.createElement('button', null, 'Confirm in your wallet'));

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
        assert.equal(surface(steps).style.opacity, '1');
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

for (const gap of [8, 12]) test(`progress collapses its ${gap}px spacing with its section`, async () => {
    const root = createRoot(container);
    const scene = active => React.createElement(WalletExecutionTransition, {
        gap, overview: 'Summary', workflow: active ? React.createElement(StepsPanel, null, 'Confirming transaction') : null,
    });
    try {
        await act(() => root.render(scene(false)));
        assert.equal(container.querySelector('[data-steps-panel]'), null);
        for (const active of [true, false, true]) {
            await act(() => root.render(scene(active)));
            const panel = surface(container.querySelector('[data-steps-panel]'));
            assert.equal(panel.firstElementChild.style.paddingTop, `${gap}px`);
            assert.ok(panel.classList.contains('overflow-hidden'));
            if (!active) assert.ok(panel.hasAttribute('inert'));
            await settle();
            assert.equal(!!container.querySelector('[data-steps-panel]'), active);
        }
    } finally { await act(() => root.unmount()); }
});

test('quote compaction and progress entry exchange space on the same animation frames', async () => {
    const root = createRoot(container);
    const scene = processing => React.createElement(SwapContentView, {
        summary: React.createElement('div', null, 'Summary'),
        quote: React.createElement(QuoteSummaryView, {
            compact: processing, isOpen: false, quoteData: { quote: {} }, values: {},
            showDestinationAddress: false,
            slippage: React.createElement('div', { 'data-slippage': true }, 'Slippage'),
            detailsButton: 'Fees',
        }),
        compactQuote: processing,
        stage: processing ? 'processing' : 'withdraw',
        progress: processing && React.createElement(StepsPanel, null, 'Processing deposit'),
    }, !processing && React.createElement('button', null, 'Confirm in your wallet'));
    try {
        await act(() => root.render(scene(false)));
        await settle();
        const quote = container.querySelector('[data-quote-transition]');
        const extras = container.querySelector('[data-slippage]').parentElement.parentElement;
        for (const processing of [true, false]) {
            await act(() => root.render(scene(processing)));
            const steps = container.querySelector('[data-steps-panel]');
            for (let frame = 0; frame < 3; frame++) {
                await act(() => new Promise(resolve => setTimeout(resolve, 65)));
                const progress = Number(surface(steps).style.opacity);
                assert.ok(progress > 0 && progress < 1, 'sample while the handoff is in flight');
                assert.ok(Math.abs(Number(extras.style.opacity) + progress - 1) < 0.03,
                    'quote rows must collapse as the steps enter, and expand as they exit');
                assert.ok(Math.abs(parseFloat(extras.style.gridTemplateRows) + progress - 1) < 0.03,
                    'quote height must follow the same progress as its opacity');
                assert.ok(Math.abs(parseFloat(quote.style.marginTop) / 8 + progress - 1) < 0.03,
                    'the gap between quote and summary must follow the same clock');
            }
            await settle();
        }
    } finally {
        await act(() => root.unmount());
    }
});

for (const actionsArriveEarly of [false, true]) test(`atomic creation ${actionsArriveEarly ? 'with prefetched details' : 'mounting processing for the first time'} animates progress with the quote and controls`, async () => {
    const root = createRoot(container);
    const originalBounds = dom.window.HTMLElement.prototype.getBoundingClientRect;
    dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
        if (this.dataset.walletExecutionPanel !== 'workflow') return originalBounds.call(this);
        const height = this.style.height.endsWith('px') ? parseFloat(this.style.height) : 184;
        return { x: 0, y: 0, top: 0, left: 0, right: 472, bottom: height, width: 472, height };
    };
    const network = { name: 'BASE_MAINNET', type: 'evm' };
    const token = { symbol: 'USDC', asset: 'USDC', contract: '0xtoken', decimals: 6 };
    const swap = { source_network: network, destination_network: network, source_token: token, destination_token: token, use_deposit_address: false };
    const details = { status: 'user_transfer_pending', transactions: [] };
    const quote = { destination_token: token, receive_amount: 100 };
    const actions = [{ type: 'send_calls', step: 'publish', status: 'action_required', calls: [{}, {}] }];
    const scene = (active, actionsReady = true) => {
        const depositActions = actionsReady ? actions : undefined;
        const resolved = resolveSwapPhase({ swapDetails: details });
        const flow = resolveSwapFlow({ swapData: swap, depositActions, quote, walletExecutionStarted: active, resolved });
        const walletProgress = {
            walletExecutionStarted: active,
            loading: true,
            actionStateText: active ? 'Confirm in your wallet' : 'Preparing swap…',
        };
        const send = getSendTransactionPresentation({ flow, quote, depositActions, ...walletProgress });
        return React.createElement(Page2Presenter, {
            flow,
            controls: null,
            footer: send.controls,
            stage: 'withdraw',
            summary: 'Summary',
            quote: React.createElement(QuoteSummaryView, {
                compact: flow.compactQuote, isOpen: false, quoteData: { quote: {} }, values: {},
                showDestinationAddress: false,
                slippage: React.createElement('div', { 'data-slippage': true }, 'Slippage'),
                detailsButton: 'Fees',
            }),
            progress: actionsReady ? getProcessingProgress({ flow, swapBasicData: swap, swapDetails: details, quote, depositActions, resolved, walletProgress }) : null,
        });
    };
    try {
        await act(() => root.render(scene(false, false)));
        await settle();
        assert.equal(container.querySelector('[data-steps-panel]'), null);
        assert.equal(container.querySelector('[data-wallet-execution-panel="controls"] button').textContent, 'Preparing swap…');
        if (actionsArriveEarly) {
            await act(() => root.render(scene(false, true)));
            await settle();
            assert.equal(container.querySelector('[data-steps-panel]'), null, 'loading with returned calls is still preparation');
            assert.equal(container.querySelector('[data-quote-layout]').dataset.quoteLayout, 'separate');
        }
        const preparing = container.querySelector('[data-wallet-execution-panel="controls"] button');
        assert.equal(preparing.textContent, 'Preparing swap…', 'preparation retains its busy control until execution starts');
        await act(() => root.render(scene(true)));
        const steps = container.querySelector('[data-steps-panel]');
        assert.equal(container.querySelector('[data-quote-layout]').dataset.quoteLayout, 'attached');
        assert.ok(preparing.closest('[inert]'), 'preparation exits on the same render that progress enters');
        // JSDOM has no default computed padding for Motion's auto-height measurement.
        surface(steps).style.padding = '0px';
        assert.equal(surface(steps).style.height, '0px', 'a previously empty slot must not reveal the full card immediately');
        assert.equal(surface(steps).style.opacity, '0');
        await act(() => new Promise(resolve => setTimeout(resolve, 100)));
        const height = parseFloat(surface(steps).style.height);
        assert.ok(height > 0 && height < 184, `progress should expand through intermediate heights, got ${surface(steps).style.height}`);
        const extras = container.querySelector('[data-slippage]').parentElement.parentElement;
        assert.ok(Math.abs(Number(extras.style.opacity) + Number(surface(steps).style.opacity) - 1) < 0.03);
        const controls = preparing.closest('[data-wallet-execution-panel="controls"]');
        assert.notEqual(controls.style.height, 'auto', 'preparation releases its height while progress expands');
        assert.ok(Math.abs(Number(controls.style.opacity) + Number(surface(steps).style.opacity) - 1) < 0.03);
        await settle();
        assert.equal(surface(steps).style.height, 'auto');
        assert.equal(container.querySelector('[data-wallet-execution-panel="controls"] button'), null);
        await act(() => root.render(scene(false)));
        assert.equal(container.querySelector('[data-steps-panel]'), steps);
        assert.ok(!!steps.closest('[inert]'));
        await act(() => new Promise(resolve => setTimeout(resolve, 100)));
        const exitingHeight = parseFloat(surface(steps).style.height);
        assert.ok(exitingHeight > 0 && exitingHeight < 184, 'rewinding collapses the same card before removing it');
        await settle();
        assert.equal(container.querySelector('[data-steps-panel]'), null);
    } finally {
        await act(() => root.unmount());
        dom.window.HTMLElement.prototype.getBoundingClientRect = originalBounds;
    }
});

for (const mode of ['component', 'modal']) test(`the ${mode} timeline reveals progress at swap creation and preserves the surface`, async () => {
    const root = createRoot(container);
    const originalBounds = dom.window.HTMLElement.prototype.getBoundingClientRect;
    dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
        if (this.dataset.walletExecutionPanel !== 'workflow') return originalBounds.call(this);
        const height = this.style.height.endsWith('px') ? parseFloat(this.style.height) : 184;
        return { x: 0, y: 0, top: 0, left: 0, right: 472, bottom: height, width: 472, height };
    };
    const scenario = scenarios.find(scenario => scenario.id === 'atomic-batch-success');
    const scene = id => {
        const milestone = scenario.milestones.find(milestone => milestone.id === id);
        return React.createElement(Page2Preview, { snapshot: milestone.snapshot, now: EPOCH + milestone.at * 1000, mode });
    };
    try {
        await act(() => root.render(scene('ready')));
        await settle();
        assert.equal(container.querySelector('[data-steps-panel]'), null, 'a quote before creation has no progress section');
        await act(() => root.render(scene('preparing')));
        await settle();
        assert.equal(container.querySelector('[data-steps-panel]'), null, 'preparation keeps progress absent');
        const preparing = [...container.querySelectorAll('button')].find(button => button.textContent === 'Preparing swap…');
        assert.ok(preparing);
        await act(() => root.render(scene('confirming')));
        assert.equal(container.querySelectorAll('[data-steps-panel]').length, 1, 'creation reveals one progress surface');
        const panel = container.querySelector('[data-steps-panel]');
        surface(panel).style.padding = '0px';
        assert.equal(surface(panel).style.height, '0px', 'the first mount must animate even though the preview is read-only');
        assert.ok(preparing.closest('[inert]'));
        await act(() => new Promise(resolve => setTimeout(resolve, 100)));
        assert.ok(parseFloat(surface(panel).style.height) > 0 && parseFloat(surface(panel).style.height) < 184);
        await settle();
        assert.equal(surface(panel).style.height, 'auto');
        assert.equal(preparing.isConnected, false);
        assert.equal(container.querySelector('[data-quote-layout]').dataset.quoteLayout, 'attached');
        await act(() => root.render(scene('submitted')));
        await settle();
        assert.equal(container.querySelectorAll('[data-steps-panel]').length, 1, 'later updates keep one progress surface');
        assert.equal(container.querySelector('[data-steps-panel]'), panel);
    } finally {
        await act(() => root.unmount());
        dom.window.HTMLElement.prototype.getBoundingClientRect = originalBounds;
    }
});

test('retry collapses failed-state actions with the steps and gives Swap now one entrance animation', async () => {
    const root = createRoot(container);
    const scene = (failed) => React.createElement(SwapContentView, {
        summary: React.createElement('div', null, 'Summary'),
        quote: React.createElement('div', null, 'Quote'),
        compactQuote: failed,
        stage: failed ? 'processing' : 'withdraw',
        progress: failed && React.createElement(StepsPanel, null, 'The transfer failed'),
    }, failed
        ? React.createElement(ProcessingSectionView, { actions: React.createElement(RetryView) })
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
            const controls = container.querySelector('[data-wallet-execution-panel="controls"]:not([inert])');
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

test('wallet prompts, transaction confirmation and completion update one persistent progress panel with motion enabled', async () => {
    const root = createRoot(container);
    const network = { name: 'BASE_MAINNET', transaction_explorer_template: 'https://basescan.org/tx/{0}' };
    const token = { asset: 'USDT', decimals: 6 };
    const swap = { source_network: network, destination_network: network, destination_token: token, use_deposit_address: false };
    const quote = { destination_token: token, receive_amount: 2.662674 };
    const actions = [
        { step: 'sign', status: 'completed' },
        { step: 'publish', status: 'action_required' },
    ];
    const scene = stage => {
        const processing = stage !== 'wallet';
        const completed = stage === 'completed';
        const details = {
            status: completed ? 'completed' : processing ? 'ls_transfer_pending' : 'user_transfer_pending',
            transactions: processing ? [
                { type: 'input', status: 'pending', transaction_hash: '0xswap', confirmations: 0, max_confirmations: 1 },
                ...(completed ? [{ type: 'output', status: 'completed', transaction_hash: '0xswap', amount: 2.662674 }] : []),
            ] : undefined,
        };
        return React.createElement(React.StrictMode, null, React.createElement(SwapContentView, {
            summary: React.createElement('div', null, 'Summary'),
            quote: React.createElement('div', null, 'Receive at least 2.649361 USDT'),
            compactQuote: true,
            stage: processing ? 'processing' : 'withdraw',
            progress: React.createElement(ProcessingView, {
                swapBasicData: swap, swapDetails: details, quote,
                depositActions: actions,
                resolved: resolveSwapPhase({ swapDetails: details }),
                walletProgress: { quote, depositActions: actions, loading: true, actionStateText: 'Confirm in your wallet' },
                transactionHash: processing ? '0xswap' : undefined,
            }),
        }, !processing && React.createElement(WalletActionTransition, { actionKey: 'send' },
            React.createElement(SendTransactionView, { quote, depositActions: actions, loading: true, showProgress: false, actionStateText: 'Confirm in your wallet' }))));
    };
    try {
        await act(() => root.render(scene('wallet')));
        await settle();
        const panel = container.querySelector('[data-steps-panel]');
        const gauge = panel.querySelector('[role="progressbar"]');
        const steps = panel.querySelector('[aria-label="Progress"]');
        const quoteNode = container.querySelector('[data-quote-transition]');
        assert.match(panel.textContent, /Confirm in your wallet/);
        assert.equal(container.querySelectorAll('[data-steps-panel]').length, 1);

        for (const stage of ['processing', 'completed', 'wallet', 'completed']) {
            await act(() => root.render(scene(stage)));
            for (const duration of [0, 70, 400]) {
                if (duration) await act(() => new Promise(resolve => setTimeout(resolve, duration)));
                assert.equal(container.querySelectorAll('[data-steps-panel]').length, 1, `${stage}: one panel throughout the handoff`);
                assert.equal(container.querySelector('[data-steps-panel]'), panel);
                assert.equal(panel.querySelector('[role="progressbar"]'), gauge);
                assert.equal(panel.querySelector('[aria-label="Progress"]'), steps);
                assert.equal(container.querySelector('[data-quote-transition]'), quoteNode);
                assert.equal(panel.closest('[inert]'), null);
                assert.equal(surface(panel).style.opacity, '1');
            }
            if (stage === 'completed') {
                assert.match(panel.textContent, /Transfer complete/);
                assert.doesNotMatch(panel.textContent, /Swap in progress|Confirm in your wallet/);
                assert.equal(panel.querySelectorAll('.animate-spin').length, 0);
            }
        }
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
        '@/components/Widget/Index': { Widget: Object.assign(childrenOnly, { Footer: childrenOnly }) },
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
            showProgress: false,
            quote: { destination_token: destinationToken, receive_amount: common.receiveAmount },
            actionStateText: 'Confirm in your wallet',
        }) },
        './Processing': { default: () => React.createElement(DepositWorkflowView, {
            ...common,
            loading: showWithdrawScreen,
            actionStateText: showWithdrawScreen ? 'Confirm in your wallet' : undefined,
            processing: showWithdrawScreen ? undefined : {
                inputStatus: 'current', outputStatus: 'upcoming', inputDescription: 'Confirming transaction',
            },
        }) },
    });
    const root = createRoot(container);
    const scene = () => React.createElement(React.StrictMode, null, React.createElement(SwapDetails, { type: 'contained' }));
    try {
        await act(() => root.render(scene()));
        await settle();
        assert.match(container.textContent, /Confirm in your wallet/);
        assert.equal(container.querySelectorAll('[data-steps-panel]').length, 1);
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
            assert.equal(surface(panels[0]).style.height, 'auto', 'the existing progress must not collapse and re-enter on submission');
            assert.equal(surface(panels[0]).style.opacity, '1');
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
        surface(panel).style.padding = '0px';
        await settle();
        await act(() => measure(400));
        await settle();
        assert.equal(surface(panel).style.height, '400px');

        await act(() => root.render(scene('address')));
        await act(() => measure(600));
        await act(() => new Promise(resolve => setTimeout(resolve, 70)));
        assert.ok(parseFloat(surface(panel).style.height) > 400 && parseFloat(surface(panel).style.height) < 600, `screen entry should tween, got ${surface(panel).style.height}`);
        await settle();
        assert.equal(surface(panel).style.height, '600px');

        await act(() => measure(500));
        await act(() => new Promise(resolve => setTimeout(resolve, 40)));
        assert.equal(surface(panel).style.height, '500px', 'in-screen quote changes track the content without a second tween');

        await act(() => root.render(scene('methods')));
        await act(() => measure(400));
        await act(() => new Promise(resolve => setTimeout(resolve, 70)));
        assert.ok(parseFloat(surface(panel).style.height) > 400 && parseFloat(surface(panel).style.height) < 500, `rewinding should tween, got ${surface(panel).style.height}`);
        await settle();
        assert.equal(surface(panel).style.height, '400px');
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
        stage: processing ? 'processing' : 'withdraw',
        progress: processing && React.createElement(StepsPanel, { label: 'Processing' }, 'Confirming transfer'),
    }, !processing && React.createElement(WalletExecutionTransition, {
            workflow: React.createElement(StepsPanel, { label: 'Wallet' }, 'Confirm in your wallet'),
        }));
    try {
        await act(() => root.render(scene(false)));
        await settle();
        const outgoing = container.querySelector('[aria-label="Wallet"]');
        await act(() => {
            flushSync(() => root.render(scene(true)));
            const incoming = container.querySelector('[aria-label="Processing"]');
            assert.equal(surface(incoming).style.opacity, '0', 'a sibling slot must not inherit visible-panel state');
            assert.equal(surface(incoming).style.height, '0px');
        });
        assert.ok(outgoing.closest('[inert]'));
        await settle();
        assert.equal(container.querySelectorAll('[data-steps-panel]').length, 1);
        assert.equal(surface(container.querySelector('[aria-label="Processing"]')).style.opacity, '1');
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
        stage: processing ? 'processing' : 'withdraw',
        progress: processing && React.createElement(StepsPanel, null, 'Processing'),
    }, processing
        ? React.createElement(ProcessingSectionView)
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

test('step labels animate changes while descriptions update immediately without animation', async () => {
    const root = createRoot(container);
    const scene = (name, confirmations) => React.createElement(React.StrictMode, null,
        React.createElement(Steps, { steps: [{
            id: 'input_transfer', name, status: 'current',
            description: React.createElement('span', null, 'Confirmations ', React.createElement('strong', null, confirmations)),
        }] }));
    try {
        await act(() => root.render(scene('Processing your deposit', '1/12')));
        const label = container.querySelector('[data-step-text]');
        const description = label.nextElementSibling;
        const counter = description.querySelector('strong');
        assert.equal(label.style.opacity, '', 'initial text appears immediately');
        assert.equal(description.style.opacity, '');
        await act(() => root.render(scene('Confirming your deposit', '2/12')));
        assert.equal(description.textContent, 'Confirmations 2/12');
        await act(() => new Promise(resolve => setTimeout(resolve, 60)));
        assert.ok(Number(label.style.opacity) > 0 && Number(label.style.opacity) < 1);
        assert.match(label.style.transform, /translateY/);
        assert.notEqual(label.style.filter, 'blur(0px)');
        assert.equal(description.getAttribute('style'), null);
        assert.equal(description.closest('[data-step-text]'), null);
        assert.equal(container.querySelector('.step-label-shimmer'), label);
        assert.equal(description.querySelector('strong'), counter);
        await settle();
        await act(() => root.render(scene('Confirming your deposit', '2/12')));
        await act(() => new Promise(resolve => setTimeout(resolve, 60)));
        assert.equal(label.style.opacity, '1', 'identical polling results do not replay the animation');
        assert.equal(label.style.transform, 'none');
        for (const confirmations of ['3/12', '4/12', '5/12']) {
            await act(() => root.render(scene('Confirming your deposit', confirmations)));
        }
        await settle();
        assert.equal(description.textContent, 'Confirmations 5/12');
        assert.equal(description.getAttribute('style'), null);
        assert.equal(label.style.opacity, '1', 'description updates do not animate the label');
        assert.equal(description.querySelector('strong'), counter);
        await act(() => root.render(React.createElement(React.StrictMode, null,
            React.createElement(Steps, { steps: [{ id: 'input_transfer', name: 'Deposit confirmed', status: 'complete' }] }))));
        await settle();
        assert.equal(description.isConnected, false);
    } finally {
        await act(() => root.unmount());
    }
});

test('header descriptions update immediately without animating or restarting the timer or title', async () => {
    const root = createRoot(container);
    let setSeconds;
    let mounts = 0;
    function Timer() {
        const [seconds, update] = React.useState(10);
        setSeconds = update;
        React.useEffect(() => { mounts++; }, []);
        return React.createElement('time', null, `${seconds}s`);
    }
    try {
        await act(() => root.render(React.createElement(TransferStatusHeader, {
            title: 'Transfer in progress', progress: 20, description: React.createElement(Timer),
        })));
        const timer = container.querySelector('time');
        const text = timer.parentElement;
        const title = container.querySelector('[data-transfer-title] span');
        await act(() => setSeconds(11));
        assert.equal(timer.textContent, '11s');
        assert.equal(timer.closest('[data-step-text]'), null);
        await act(() => new Promise(resolve => setTimeout(resolve, 60)));
        assert.equal(text.getAttribute('style'), null);
        assert.equal(title.style.opacity, '1');
        await settle();
        assert.equal(timer.textContent, '11s');
        assert.equal(container.querySelector('time'), timer);
        assert.equal(mounts, 1);
        assert.equal(text.getAttribute('style'), null);
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
