import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

// Exercise presence with motion enabled. The main timeline suite verifies
// reduced motion; it cannot catch controls unmounting before their exit ends.
const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true });
for (const name of ['window', 'document', 'HTMLElement', 'Element', 'SVGElement', 'Node', 'getComputedStyle']) {
    globalThis[name] = dom.window[name];
}
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
dom.window.scrollTo = () => {};
const measurements = new Map();
globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; }
    observe(node) { measurements.set(this, node); }
    disconnect() { measurements.delete(this); }
};

const directory = dirname(fileURLToPath(import.meta.url));
const temporary = mkdtempSync(join(directory, '.timeline-motion-'));
process.on('exit', () => rmSync(temporary, { recursive: true, force: true }));
const outfile = join(temporary, 'motion.mjs');
await build({
    stdin: {
        contents: `
            export { SwapContentView, ProcessingSectionView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/Page2Sections.js';
            export { StepsPanel } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Processing/StepsComponent.js';
            export { ProcessingView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/ProcessingView.js';
            export { resolveSwapPhase } from '../../packages/widget/core/dist/esm/components/utils/resolveSwapPhase.js';
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
    banner: { js: "import { createRequire as _createRequire } from 'node:module'; const require = _createRequire(import.meta.url);" },
    external: ['react', 'react-dom', 'react-dom/*', 'framer-motion'],
    mainFields: ['module', 'main'],
    logLevel: 'silent',
});
const { SwapContentView, ProcessingSectionView, StepsPanel, ProcessingView, resolveSwapPhase, DepositWorkflowView, WalletExecutionTransition, WalletActionTransition, SendTransactionView, RetryView, DepositLayoutView, DepositAddressTransition } = await import(pathToFileURL(outfile));
const container = document.getElementById('root');
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
                assert.equal(panel.style.opacity, '1');
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

test.after(() => dom.window.close());
