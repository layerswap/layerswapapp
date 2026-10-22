import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ts from 'typescript';

// Exercise motion-enabled transitions: outgoing controls must be inactive,
// and interruptions must leave one usable screen after the transition settles.
const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true });
for (const name of ['window', 'document', 'HTMLElement', 'Element', 'SVGElement', 'Node', 'NodeList', 'getComputedStyle', 'customElements']) {
    globalThis[name] = dom.window[name];
}
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
dom.window.scrollTo = () => {};
globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

const directory = dirname(fileURLToPath(import.meta.url));
const widgetRequire = createRequire(new URL('../../../packages/widget/core/package.json', import.meta.url));
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
            export { DepositWorkflowView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/DepositWorkflowView.js';
            export { WalletExecutionTransition } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletExecutionTransition.js';
            export { WalletActionTransition } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletActionTransition.js';
            export { SendTransactionView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletActionsView.js';
            export { RetryView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/RetryView.js';
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
const { SwapContentView, ProcessingSectionView, StepsPanel, Steps, TransferStatusHeader, QuoteView, DepositWorkflowView, WalletExecutionTransition, WalletActionTransition, SendTransactionView, RetryView, DepositAddressTransition } = await import(pathToFileURL(outfile));
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
const view = processing => React.createElement(SwapContentView, {
    summary: React.createElement('div', null, 'Summary'),
    quote: React.createElement('div', null, 'Quote'),
    compactQuote: processing,
    transferStage: processing ? 'processing' : 'withdraw',
}, processing
    ? React.createElement(StepsPanel, null, 'Processing deposit')
    : React.createElement('button', null, 'Confirm in your wallet'));

test('outgoing transfer controls are inactive and the screen remains usable after returning', async () => {
    const root = createRoot(container);
    try {
        await act(() => root.render(view(false)));
        await act(() => root.render(view(true)));
        const controls = container.querySelector('[data-wallet-execution-panel="controls"]');
        if (controls) assert.ok(controls.closest('[inert]'));
        await settle();
        assert.equal(container.querySelector('[data-wallet-execution-panel="controls"]'), null);
        const steps = container.querySelector('[data-steps-panel]');
        assert.ok(steps);
        assert.equal(steps.closest('[inert]'), null);
        assert.equal(steps.style.opacity, '1');
        await act(() => root.render(view(false)));
        if (steps.isConnected) assert.ok(steps.closest('[inert]'));
        await settle();
        assert.equal(container.querySelector('[data-steps-panel]'), null);
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

test('leaving a failed swap deactivates retry controls and restores one usable send button', async () => {
    const root = createRoot(container);
    const scene = failed => React.createElement(SwapContentView, {
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
        assert.ok(actions);
        await act(() => root.render(scene(false)));
        if (actions.isConnected) assert.ok(actions.closest('[inert]'));
        await settle();
        assert.equal(container.querySelector('[data-processing-actions]'), null);
        assert.equal(container.querySelector('[data-steps-panel]'), null);
        assert.deepEqual([...container.querySelectorAll('button')].map(button => button.textContent), ['Swap now']);
        assert.equal(container.querySelector('button').closest('[inert]'), null);
        for (const failed of [true, false, true, false]) await act(() => root.render(scene(failed)));
        await settle();
        assert.equal(container.querySelector('[data-processing-actions]'), null);
        assert.deepEqual([...container.querySelectorAll('button')].map(button => button.textContent), ['Swap now']);
        assert.equal(container.querySelector('button').closest('[inert]'), null);
    } finally {
        await act(() => root.unmount());
    }
});

test('submission hands off from the live wallet controller to one active processing panel', async () => {
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
    let showWithdrawScreen = true;
    const { resolveSwapFlow } = loadWidgetSource('components/utils/resolveSwapFlow.ts', {});
    const common = { actions: context.depositActionsResponse, destinationToken, receiveAmount: 2.652761339210903 };
    const { default: SwapDetails } = loadWidgetSource('components/Pages/Swap/Withdraw/SwapDetails.tsx', {
        './Presentation/Page2Sections': { SwapContentView, ProcessingSectionView },
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
        context.walletExecutionStarted = false;
        showWithdrawScreen = false;
        await act(() => root.render(scene()));
        await settle();
        const panels = container.querySelectorAll('[data-steps-panel]');
        assert.equal(panels.length, 1);
        assert.equal(panels[0].closest('[inert]'), null);
        assert.equal(panels[0].style.opacity, '1');
        assert.match(panels[0].textContent, /Confirming transaction/);
    } finally {
        await act(() => root.unmount());
    }
});

test('departing deposit instructions are inactive and become usable again on return', async () => {
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
        await act(() => root.render(scene(true)));
        const details = container.querySelector('[data-wallet-execution-panel="controls"]');
        if (details) assert.ok(details.closest('[inert]'));
        await settle();
        assert.equal(container.querySelector('[data-wallet-execution-panel="controls"]'), null);
        const confirmation = container.querySelector('[data-steps-panel]');
        assert.ok(confirmation);
        assert.equal(confirmation.closest('[inert]'), null);

        await act(() => root.render(scene(false)));
        if (confirmation.isConnected) assert.ok(confirmation.closest('[inert]'));
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

test('changing execution slots deactivates outgoing steps and settles on the latest screen', async () => {
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
        await act(() => root.render(scene(true)));
        if (outgoing.isConnected) assert.ok(outgoing.closest('[inert]'));
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
        if (actions.isConnected) assert.ok(actions.closest('[inert]'));
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

test('the visible transfer status settles on the latest rapid update', async () => {
    const root = createRoot(container);
    const scene = title => React.createElement(TransferStatusHeader, { title, progress: 20 });
    try {
        await act(() => root.render(scene('Transfer in progress')));
        for (const title of ['Transfer complete', 'Refund pending', 'Refund sent']) {
            await act(() => root.render(scene(title)));
        }
        // Let React commit the exit before advancing the incoming text.
        for (let i = 0; i < 2; i++) await act(() => new Promise(resolve => setTimeout(resolve, 200)));
        assert.equal(container.querySelector('[data-transfer-title]').textContent, 'Refund sent');
        assert.equal(container.querySelector('h3').getAttribute('aria-label'), 'Refund sent');
        await act(() => root.render(scene('Transfer complete')));
        await act(() => root.render(scene('Refund sent')));
        await settle();
        assert.equal(container.querySelector('[data-transfer-title]').textContent, 'Refund sent');
    } finally {
        await act(() => root.unmount());
    }
});

test('confirmation updates and completed step text replace the previous pending state', async () => {
    const root = createRoot(container);
    const scene = (name, confirmations, status = 'current') => React.createElement(Steps, { steps: [{
        id: 'input_transfer', name, status,
        description: confirmations && React.createElement('span', null, `Confirmations ${confirmations}`),
    }] });
    try {
        await act(() => root.render(scene('Processing your deposit', '1/12')));
        for (const count of ['2/12', '3/12', '5/12']) {
            await act(() => root.render(scene('Confirming your deposit', count)));
        }
        assert.match(container.textContent, /Confirmations 5\/12/);
        await act(() => root.render(scene('Deposit confirmed', undefined, 'complete')));
        for (let i = 0; i < 2; i++) await act(() => new Promise(resolve => setTimeout(resolve, 200)));
        assert.equal(container.querySelector('[data-step-text]').textContent, 'Deposit confirmed');
        assert.doesNotMatch(container.textContent, /Confirmations|Processing your deposit/);
        assert.equal(container.querySelector('[data-status-step="input_transfer"]').hasAttribute('aria-current'), false);
    } finally {
        await act(() => root.unmount());
    }
});

test('closing quote details makes them inactive before removing their contents', async () => {
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
        await settle();
        assert.equal(details.textContent, '');
    } finally {
        await act(() => root.unmount());
    }
});

test.after(() => dom.window.close());
