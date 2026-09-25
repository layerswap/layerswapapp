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

const directory = dirname(fileURLToPath(import.meta.url));
const temporary = mkdtempSync(join(directory, '.timeline-motion-'));
process.on('exit', () => rmSync(temporary, { recursive: true, force: true }));
const outfile = join(temporary, 'motion.mjs');
await build({
    stdin: {
        contents: `
            export { SwapContentView, ProcessingSectionView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/Page2Sections.js';
            export { StepsPanel } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Processing/StepsComponent.js';
            export { DepositWorkflowView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/DepositWorkflowView.js';
            export { WalletExecutionTransition } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletExecutionTransition.js';
            export { WalletActionTransition } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletActionTransition.js';
            export { SendTransactionView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletActionsView.js';
            export { RetryView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/RetryView.js';
        `,
        resolveDir: join(directory, '..'),
        loader: 'tsx',
    },
    outfile,
    platform: 'node',
    format: 'esm',
    bundle: true,
    external: ['react', 'react-dom', 'react-dom/*', 'framer-motion'],
    mainFields: ['module', 'main'],
    logLevel: 'silent',
});
const { SwapContentView, ProcessingSectionView, StepsPanel, DepositWorkflowView, WalletExecutionTransition, WalletActionTransition, SendTransactionView, RetryView } = await import(pathToFileURL(outfile));
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

test.after(() => dom.window.close());
