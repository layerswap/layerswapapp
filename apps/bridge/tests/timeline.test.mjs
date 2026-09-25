import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';

const directory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const temporary = mkdtempSync(join(directory, '.timeline-'));
process.on('exit', () => rmSync(temporary, { recursive: true, force: true }));
const dom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    { url: 'https://timeline.example.invalid' },
);
for (const name of [
    'window',
    'document',
    'HTMLElement',
    'Element',
    'SVGElement',
    'Node',
    'DocumentFragment',
    'MutationObserver',
    'CustomEvent',
    'getComputedStyle',
    'customElements',
]) {
    globalThis[name] = dom.window[name];
}
Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
dom.window.matchMedia = () => ({
    matches: true,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
});
dom.window.scrollTo = () => {};
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
};
const forbidden = [];
const reject = (name) => () => {
    forbidden.push(name);
    throw new Error(`Preview called ${name}`);
};
globalThis.fetch = reject('fetch');
dom.window.fetch = globalThis.fetch;
dom.window.XMLHttpRequest.prototype.open = reject('XHR');
dom.window.ethereum = { request: reject('wallet request') };
dom.window.Intercom = reject('support');
for (const method of ['setItem', 'removeItem', 'clear'])
    dom.window.Storage.prototype[method] = reject(`storage.${method}`);
globalThis.localStorage = dom.window.localStorage;
globalThis.sessionStorage = dom.window.sessionStorage;
const originalInterval = globalThis.setInterval;
globalThis.setInterval = reject('setInterval');
// Detect native input events against JSDOM so slider changes exercise React's handlers.
const { createRoot, hydrateRoot } = await import('react-dom/client');

// Bundle the actual package export, using the same workspace package boundaries as Next.
const result = await build({
    stdin: {
        contents: `export { Page2Preview, resolveSwapPhase, SwapPhase } from '@layerswap/widget/internal';
        export { scenarios, scenarioGroups, EPOCH } from './features/timeline/fixtures';
        export { selectTime, selectScenario } from './features/timeline/model';
        export { default as TimelinePage } from './pages/timeline.dev.mjs';
        export { default as App } from './pages/_app';
        export { SendTransactionView, ConnectWalletView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletActionsView.js';
        export { ProcessingView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/ProcessingView.js';
        export { gaslessFailureMessage } from '../../packages/widget/core/dist/esm/helpers/gaslessFailureMessage.js';
        export { SpecializedWithdrawalView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/SpecializedWithdrawalView.js';
        export { default as ProductionSummary } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Summary/Summary.js';
        export { default as ProductionAddressIcon } from '../../packages/widget/core/dist/esm/components/Common/AddressIcon/index.js';
        export { SlippageView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Form/FeeDetails/SlippageView.js';
        export { Slippage as ProductionSlippage } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Form/FeeDetails/Slippage.js';
        export { GasFeeView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Form/FeeDetails/SwapQuote/GasFeeView.js';
        export { ChangeNetworkView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletActionsView.js';
        export { ManualDepositButtonView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/ManualDepositButtonView.js';
        export { ConfirmationContent } from '../../packages/widget/core/dist/esm/components/Modal/ConfirmationContent.js';
        export { CopyButtonView } from '@layerswap/ui-kit/components';
        export { SettingsStateContext } from '../../packages/widget/core/dist/esm/context/settings.js';`,
        resolveDir: resolve(directory, '..'),
        loader: 'tsx',
    },
    outfile: join(temporary, 'preview.mjs'),
    platform: 'node',
    format: 'esm',
    bundle: true,
    loader: { '.js': 'jsx' },
    external: [
        'react',
        'react-dom',
        'react-dom/*',
        'next/head',
        'framer-motion',
    ],
    banner: {
        js: "import { createRequire as _createRequire } from 'node:module'; const require = _createRequire(import.meta.url);",
    },
    mainFields: ['module', 'main'],
    jsx: 'automatic',
    metafile: true,
    logLevel: 'silent',
    plugins: [
        {
            name: 'workspace-packages',
            setup(builder) {
                builder.onResolve({ filter: /^next\/(head|router)$/ }, (args) => ({
                    path: require.resolve(args.path),
                    external: true,
                }));
                builder.onResolve({ filter: /^@layerswap\// }, (args) => ({
                    path: require.resolve(args.path, {
                        paths: [args.resolveDir],
                    }),
                }));
                builder.onLoad({ filter: /\.module\.css$/ }, () => ({
                    contents:
                        'export default new Proxy({}, { get: (_, key) => key });',
                    loader: 'js',
                }));
                builder.onLoad({ filter: /\.css$/ }, () => ({
                    contents: '',
                    loader: 'js',
                }));
            },
        },
    ],
});
const {
    Page2Preview,
    resolveSwapPhase,
    SwapPhase,
    scenarios,
    scenarioGroups,
    EPOCH,
    selectTime,
    selectScenario,
    TimelinePage,
    App,
    SendTransactionView,
    ProcessingView,
    gaslessFailureMessage,
    ConnectWalletView,
    SpecializedWithdrawalView,
    ProductionSummary,
    ProductionAddressIcon,
    SlippageView,
    ProductionSlippage,
    GasFeeView,
    ChangeNetworkView,
    ManualDepositButtonView,
    ConfirmationContent,
    CopyButtonView,
    SettingsStateContext,
} = await import(pathToFileURL(join(temporary, 'preview.mjs')).href);

test('app respects the page layout without coupling provider selection to its URL', () => {
    const router = { asPath: '/timeline', pathname: '/timeline' };
    const previewPage = App({ Component: TimelinePage, pageProps: {}, router });
    assert.equal(previewPage.type, TimelinePage, 'preview renders directly without the app providers');

    function NormalPage() { return null; }
    const normalPage = App({ Component: NormalPage, pageProps: { sample: true }, router });
    assert.notEqual(normalPage.type, NormalPage, 'normal pages still receive the default layout, even at the same URL');
    assert.equal(normalPage.props.children.type, NormalPage);
    assert.equal(normalPage.props.children.props.sample, true);
    assert.equal(normalPage.props.children.key, router.asPath);

    const otherUrl = App({ Component: TimelinePage, pageProps: {}, router: { asPath: '/another-preview' } });
    assert.equal(otherUrl.type, TimelinePage, 'layout selection belongs to the page, not the pathname');
});

const preview = (snapshot, seconds, mode = 'component') =>
    React.createElement(Page2Preview, {
        snapshot,
        mode,
        now: EPOCH + seconds * 1000,
    });
const phase = (s) =>
    resolveSwapPhase({
        swapDetails: s.details,
        refuel: s.refuel,
        storedWalletTransaction: s.storedWalletTransaction,
        inputTxStatusFromApi: s.inputTxStatusFromApi,
        gaslessAuthorizationFailed: [
            'expired',
            'insufficient',
            'rejected',
        ].includes(s.gaslessAuthorization?.status),
        isDepositFlow: s.isDepositFlow,
    });

test('flow navigation includes every scenario once and keeps related cases together', () => {
    const visible = scenarioGroups.flatMap(group => group.scenarios);
    assert.equal(visible.length, scenarios.length);
    assert.equal(new Set(visible.map(scenario => scenario.id)).size, scenarios.length);
    assert.deepEqual([...visible].map(scenario => scenario.id).sort(), scenarios.map(scenario => scenario.id).sort());
    assert.equal(scenarioGroups[0].scenarios[0].id, 'wallet-success');
    for (const group of scenarioGroups) {
        assert.ok(group.scenarios.length > 0, group.id);
        for (const section of group.sections) {
            assert.ok(section.scenarios.length > 0, `${group.id}/${section.id}`);
        }
    }
    const groupIds = id => scenarioGroups.find(group => group.id === id).scenarios.map(scenario => scenario.id);
    assert.deepEqual(groupIds('manual-deposit'), ['manual-network', 'manual-exchange', 'minimum-update', 'maximum-update']);
    assert.deepEqual(groupIds('page-states'), ['initial-loading', 'not-found']);
    for (const provider of ['Hyperliquid', 'Polymarket']) {
        assert.deepEqual(groupIds(provider.toLowerCase()), scenarios.filter(scenario => scenario.id.startsWith(`${provider}-`)).map(scenario => scenario.id));
    }
    for (const id of ['wallet-success', 'refuel', 'rpc', 'swap-error', 'input-failure', 'refund']) {
        assert.ok(groupIds('wallet-transfer').includes(id), id);
    }
});

test('chronological, identified fixtures select exact, intermediate and boundary snapshots', () => {
    assert.equal(scenarios[0].id, 'wallet-success');
    assert.equal(new Set(scenarios.map((s) => s.id)).size, scenarios.length);
    for (const scenario of scenarios) {
        const entries = scenario.milestones;
        assert.equal(
            new Set(entries.map((m) => m.id)).size,
            entries.length,
            scenario.id,
        );
        assert.equal(selectTime(scenario, -100).milestone, entries[0]);
        assert.equal(selectTime(scenario, 1e6).milestone, entries.at(-1));
        assert.equal(selectTime(scenario, entries[0].at).previous, undefined);
        assert.equal(selectTime(scenario, entries.at(-1).at).next, undefined);
        for (let i = 0; i < entries.length; i++) {
            const milestone = entries[i];
            assert.ok(Number.isInteger(milestone.at));
            assert.equal(
                selectTime(scenario, milestone.at).milestone,
                milestone,
            );
            assert.equal(
                selectTime(scenario, milestone.at).previous,
                entries[i - 1],
            );
            assert.equal(
                selectTime(scenario, milestone.at).next,
                entries[i + 1],
            );
            if (i < entries.length - 1) {
                assert.ok(entries[i + 1].at > milestone.at, scenario.id);
                const between = selectTime(scenario, milestone.at + 1);
                assert.equal(between.milestone, milestone);
                assert.equal(between.previous, milestone);
                assert.equal(between.next, entries[i + 1]);
            }
        }
        let selected = selectTime(scenario, entries.at(-1).at);
        for (let i = entries.length - 2; i >= 0; i--) {
            selected = selectTime(scenario, selected.previous.at);
            assert.equal(selected.milestone, entries[i]);
        }
        assert.deepEqual(selectScenario(scenario), {
            scenarioId: scenario.id,
            seconds: entries[0].at,
        });
    }
});

test('lifecycle fixtures agree with the existing resolver, including refuel, refunds and gasless failures', () => {
    for (const scenario of scenarios)
        for (const m of scenario.milestones) {
            if (m.snapshot.kind !== 'swap') continue;
            if (m.expectedPhase)
                assert.equal(
                    phase(m.snapshot).phase,
                    m.expectedPhase,
                    `${scenario.id}/${m.id}`,
                );
        }
    const find = (scenarioId, milestoneId) =>
        scenarios
            .find((s) => s.id === scenarioId)
            .milestones.find((m) => m.id === milestoneId).snapshot;
    assert.equal(phase(find('wallet-success', 'finalizing')).isTerminal, false);
    assert.equal(
        phase(find('refuel', 'pending')).stepStatuses.refuel,
        'current',
    );
    assert.equal(phase(find('refuel', 'complete')).isTerminal, true);
    assert.equal(
        phase(find('refund', 'refund-pending')).stepStatuses.refund,
        'current',
    );
    for (const status of ['expired', 'insufficient', 'rejected']) {
        assert.equal(
            phase(find(`gasless-${status}`, 'failed')).phase,
            SwapPhase.Failed,
        );
        assert.equal(
            phase(find(`gasless-${status}`, 'retry')).phase,
            SwapPhase.AwaitingUserDeposit,
        );
    }
});

test('fixture quotes match their route and gas adjustments use the native token', () => {
    for (const scenario of scenarios)
        for (const { id, snapshot: s } of scenario.milestones) {
            if (s.kind !== 'swap') continue;
            const context = `${scenario.id}/${id}`;
            if (s.quote) {
                for (const side of ['source', 'destination']) {
                    assert.equal(
                        s.quote[`${side}_network`].name,
                        s.swap[`${side}_network`].name,
                        context,
                    );
                    assert.equal(
                        s.quote[`${side}_token`].symbol,
                        s.swap[`${side}_token`].symbol,
                        context,
                    );
                }
                assert.equal(
                    s.quote.requested_amount,
                    Number(s.swap.requested_amount),
                    context,
                );
            }
            if (s.balanceWarning?.kind === 'gas') {
                assert.equal(
                    s.swap.source_token.symbol,
                    s.swap.source_network.token.symbol,
                    context,
                );
            }
        }
});

test('published transaction timestamps stay stable as each scenario advances', () => {
    for (const scenario of scenarios) {
        const timestamps = new Map();
        for (const { id, at, snapshot: s } of scenario.milestones) {
            if (s.kind !== 'swap') continue;
            for (const transaction of s.details.transactions) {
                const context = `${scenario.id}/${id}/${transaction.type}`;
                const key = `${transaction.type}/${transaction.transaction_hash}`;
                const timestamp = Date.parse(transaction.timestamp);
                assert.ok(timestamp <= EPOCH + at * 1000, context);
                if (timestamps.has(key)) {
                    assert.equal(timestamp, timestamps.get(key), context);
                }
                timestamps.set(key, timestamp);
            }
        }
    }
});

test('every fixture renders in both modes without application providers or incomplete values', () => {
    for (const mode of ['component', 'modal'])
        for (const scenario of scenarios)
            for (const m of scenario.milestones) {
                let html;
                assert.doesNotThrow(() => {
                    html = renderToStaticMarkup(
                        preview(m.snapshot, m.at, mode),
                    );
                }, `${scenario.id}/${m.id}`);
                if (mode === 'modal') {
                    assert.match(html, /data-page2-modal="true" data-state="open"/);
                } else {
                    assert.doesNotMatch(html, /data-page2-modal/);
                }
                assert.ok(
                    html.includes('Read-only preview'),
                    `${scenario.id}/${m.id}`,
                );
                assert.doesNotMatch(
                    html,
                    />[^<]*(?:undefined|NaN)[^<]*</,
                    `${scenario.id}/${m.id}`,
                );
                assert.doesNotMatch(
                    html,
                    /href="https?:/,
                    `${scenario.id}/${m.id}`,
                );
            }
});

test('limit changes show a separate confirmation drawer over loading instructions in both modes', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    try {
        for (const scenarioId of ['minimum-update', 'maximum-update']) {
            const scenario = scenarios.find((s) => s.id === scenarioId);
            for (const mode of ['component', 'modal']) {
                for (const seconds of [0, 5, 15, 5, 0]) {
                    const { milestone } = selectTime(scenario, seconds);
                    await act(async () =>
                        root.render(preview(milestone.snapshot, seconds, mode)),
                    );
                    const confirmation = container.querySelector(
                        '[role="dialog"][aria-label="Confirm transfer limits"]',
                    );
                    const context = `${scenarioId}/${mode}/${seconds}`;
                    if (seconds !== 5) {
                        assert.equal(confirmation, null, context);
                        assert.ok(
                            container.textContent.includes('Copy the deposit address'),
                            context,
                        );
                        continue;
                    }

                    assert.ok(confirmation, context);
                    assert.ok(
                        confirmation.hasAttribute('data-vaul-drawer'),
                        context,
                    );
                    assert.match(
                        confirmation.parentElement.id,
                        /^page2-preview-widget-/,
                        context,
                    );
                    assert.equal(
                        container.querySelectorAll('[role="dialog"]').length,
                        mode === 'modal' ? 2 : 1,
                        context,
                    );
                    assert.equal(
                        container.querySelector('[data-page2-modal]')?.contains(confirmation) ?? false,
                        false,
                        context,
                    );
                    const buttons = [...confirmation.querySelectorAll('button')];
                    for (const label of ['Continue', 'Cancel']) {
                        assert.ok(
                            buttons.some((button) => button.textContent === label),
                            context,
                        );
                    }
                    assert.ok(
                        !confirmation.textContent.includes('Copy deposit address'),
                        context,
                    );
                    assert.ok(
                        !container.textContent.includes('Copy the deposit address'),
                        context,
                    );
                    assert.equal(
                        container.querySelectorAll('.animate-pulse').length,
                        3,
                        context,
                    );
                }
            }
        }
        assert.deepEqual(forbidden, []);
    } finally {
        await act(async () => root.unmount());
    }
});

test('time between milestones updates elapsed text; rewind restores amounts, messages, confirmations and action state', () => {
    const standard = scenarios[0];
    const at20 = renderToStaticMarkup(
        preview(selectTime(standard, 20).milestone.snapshot, 20),
    );
    const at29 = renderToStaticMarkup(
        preview(selectTime(standard, 29).milestone.snapshot, 29),
    );
    assert.ok(at20.includes('00:00'));
    assert.ok(at29.includes('00:09'));
    assert.ok(at29.includes('Confirmations'));
    assert.ok(
        renderToStaticMarkup(
            preview(selectTime(standard, 90).milestone.snapshot, 90),
        ).includes('Transfer complete'),
    );
    assert.equal(
        renderToStaticMarkup(
            preview(selectTime(standard, 20).milestone.snapshot, 20),
        ),
        at20,
    );
});

test('standard and token swaps keep elapsed time running through finalizing', () => {
    for (const [scenarioId, milestoneId, currentTime, laterTime] of [
        ['wallet-success', 'finalizing', '00:55', '01:04'],
        ['frontend-permit2', 'finalizing', '00:20', '00:29'],
        ['refuel', 'pending', '01:10', '01:19'],
    ]) {
        const scenario = scenarios.find(s => s.id === scenarioId);
        const milestone = scenario.milestones.find(m => m.id === milestoneId);
        assert.equal(phase(milestone.snapshot).phase, SwapPhase.SettlingOutput);
        const container = document.createElement('div');
        for (const [at, expected] of [[milestone.at, currentTime], [milestone.at + 9, laterTime]]) {
            container.innerHTML = renderToStaticMarkup(preview(milestone.snapshot, at));
            assert.equal(container.querySelector('[role="timer"]')?.textContent, `Elapsed time:${expected}`, scenarioId);
            assert.doesNotMatch(container.textContent, /Finalizing…/);
        }
        const completed = scenario.milestones.at(-1);
        container.innerHTML = renderToStaticMarkup(preview(completed.snapshot, completed.at));
        assert.equal(container.querySelector('[role="timer"]'), null, scenarioId);
    }
});

test('reduced-motion hydration matches the server markup in both modes', async () => {
    const container = document.getElementById('root');
    const errors = [];
    const quotes = scenarios.find((s) => s.id === 'quote-loading');
    for (const mode of ['component', 'modal']) {
        for (const milestone of [scenarios[0].milestones[0], quotes.milestones.at(-1)]) {
            const element = preview(milestone.snapshot, milestone.at, mode);
            container.innerHTML = renderToString(element);
            let root;
            await act(async () => {
                root = hydrateRoot(container, element, {
                    onRecoverableError: (error) => errors.push(error.message),
                });
            });
            await act(async () => root.unmount());
        }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(forbidden, []);
});

test('all mounted previews ignore clicks and keyboard activation without requests, persistence or reports', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => errors.push(args.join(' '));
    try {
        for (const mode of ['component', 'modal'])
            for (const scenario of scenarios) {
                const displayed = new Map();
                for (const m of scenario.milestones) {
                    await act(async () =>
                        root.render(preview(m.snapshot, m.at, mode)),
                    );
                    for (const progress of container.querySelectorAll('nav[aria-label="Progress"]')) {
                        const panel = progress.closest('[data-steps-panel]');
                        const label = `${scenario.id}/${m.id}/${mode}`;
                        assert.ok(panel, `${label}: every flow uses the shared steps animation`);
                        assert.equal(panel.style.height, 'auto', `${label}: reduced motion shows steps immediately`);
                        assert.equal(panel.style.opacity, '1', label);
                        assert.equal(panel.parentElement.closest('[data-steps-panel]'), null, `${label}: no nested panel animations`);
                    }
                    const before = container.textContent;
                    displayed.set(m.id, before);
                    await act(async () => {
                        for (const action of container.querySelectorAll(
                            'button, a, [role="button"], [class*="cursor-pointer"]',
                        )) {
                            action.dispatchEvent(
                                new window.MouseEvent('click', {
                                    bubbles: true,
                                    cancelable: true,
                                }),
                            );
                            action.dispatchEvent(
                                new window.MouseEvent('auxclick', {
                                    bubbles: true,
                                    cancelable: true,
                                    button: 1,
                                }),
                            );
                            action.dispatchEvent(
                                new window.KeyboardEvent('keydown', {
                                    key: 'Enter',
                                    bubbles: true,
                                    cancelable: true,
                                }),
                            );
                        }
                    });
                    assert.equal(
                        container.textContent,
                        before,
                        `${scenario.id}/${m.id}`,
                    );
                }
                for (const m of [...scenario.milestones].reverse()) {
                    await act(async () =>
                        root.render(preview(m.snapshot, m.at, mode)),
                    );
                    assert.equal(
                        container.textContent,
                        displayed.get(m.id),
                        `${scenario.id}/${m.id} rewind`,
                    );
                }
            }
        assert.deepEqual(forbidden, []);
        assert.deepEqual(errors, []);
    } finally {
        await act(async () => root.unmount());
        console.error = originalError;
    }
});

const chooseOption = async (container, selector, label) => {
    const picker = container.querySelector(selector);
    await act(async () => picker.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
    const option = [...document.querySelectorAll('[role="option"]')].find(item => item.textContent === label);
    assert.ok(option, label);
    await act(async () => option.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
};
const chooseGroup = (container, group) => chooseOption(container, '#timeline-group', group);
const chooseScenario = (container, scenario) => chooseOption(container, '#timeline-scenario', scenario);
const chooseMode = async (container, mode) => {
    const tab = [...container.querySelectorAll('[role="tab"]')].find(item => item.textContent.toLowerCase() === mode);
    assert.ok(tab, mode);
    await act(async () => tab.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
};
const chooseLayout = async (container, label) => {
    const button = [...container.querySelectorAll('[aria-label="Preview layout"] button')].find(button => button.textContent === label);
    assert.ok(button, label);
    await act(async () => button.click());
    assert.equal(button.getAttribute('aria-pressed'), 'true');
};

test('canvas is the default and its controls panel can hide without resetting previews', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    try {
        await act(async () => root.render(React.createElement(TimelinePage)));
        assert.equal(container.querySelector('[aria-label="Preview layout"] [aria-pressed="true"]').textContent, 'Canvas');
        assert.equal(container.querySelector('[aria-label="Timeline controls"]'), null);
        const panel = container.querySelector('#canvas-controls');
        assert.equal(panel.hidden, false);
        assert.ok(panel.querySelector('#timeline-group'));
        assert.ok(panel.querySelector('#timeline-scenario'));
        assert.ok(panel.querySelector('[role="tablist"]'));
        const firstPreview = container.querySelector('[data-page2-preview]');
        await act(async () => firstPreview.querySelector('[aria-label="See details"]').click());
        await chooseOption(container, '#canvas-pages-per-row', '4');
        const world = container.querySelector('[data-canvas-transform]');
        const before = world.style.transform;
        const toggle = container.querySelector('[aria-controls="canvas-controls"]');
        await act(async () => toggle.click());
        assert.equal(panel.hidden, true);
        assert.equal(toggle.getAttribute('aria-expanded'), 'false');
        assert.equal(toggle.getAttribute('aria-label'), 'Show canvas controls');
        assert.equal(container.querySelector('[data-page2-preview]'), firstPreview);
        assert.equal(container.querySelector('[data-milestone-id] [data-value="quote"] [data-page2-quote-disclosure][aria-expanded]').getAttribute('aria-expanded'), 'true');
        assert.equal(world.style.transform, before);
        await act(async () => toggle.click());
        assert.equal(panel.hidden, false);
        assert.equal(toggle.getAttribute('aria-expanded'), 'true');
        assert.equal(container.querySelector('#canvas-pages-per-row').textContent, '4');
        await chooseMode(container, 'modal');
        assert.equal(container.querySelectorAll('[data-page2-modal]').length, scenarios[0].milestones.length);
        await act(async () => toggle.click());
        await chooseLayout(container, 'Timeline');
        assert.equal(container.querySelector('#canvas-controls'), null);
        assert.ok(container.querySelector('aside[aria-label="Scenarios"]'));
        await chooseLayout(container, 'Canvas');
        assert.equal(container.querySelector('#canvas-controls').hidden, true);
        assert.deepEqual(forbidden, []);
    } finally {
        await act(async () => root.unmount());
    }
});

test('canvas shows ordered snapshots at their own times and restores the timeline position', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    const scenario = scenarios[0];
    try {
        await act(async () => root.render(React.createElement(TimelinePage)));
        await chooseLayout(container, 'Timeline');
        const next = [...container.querySelectorAll('button')].find(button => button.textContent === 'Next →');
        await act(async () => next.click());
        const timelineTime = container.querySelector('#timeline-time').value;
        const timelineTitle = container.querySelector('#scenario-title').textContent;
        await chooseLayout(container, 'Canvas');
        assert.equal(container.querySelector('[aria-label="Timeline controls"]'), null);
        const strip = container.querySelector('[aria-label="Scenario canvas"]');
        assert.equal(strip.tabIndex, 0, 'the canvas is keyboard-focusable');
        const cards = [...strip.querySelectorAll('[data-milestone-id]')];
        assert.deepEqual(cards.map(card => card.dataset.milestoneId), scenario.milestones.map(milestone => milestone.id));
        for (const [index, card] of cards.entries()) {
            const milestone = scenario.milestones[index];
            assert.equal(card.querySelector('h3').textContent, milestone.label);
            assert.ok(card.querySelector('header').textContent.includes(`Step ${index + 1}`));
            assert.ok(card.querySelector('[data-page2-preview]'), milestone.id);
        }
        assert.match(strip.querySelector('[data-milestone-id="confirmations"]').textContent, /Elapsed time:00:00/);
        assert.match(strip.querySelector('[data-milestone-id="more-confirmations"]').textContent, /Elapsed time:00:15/);
        assert.match(strip.querySelector('[data-milestone-id="output-pending"]').textContent, /Elapsed time:00:30/);
        assert.match(strip.querySelector('[data-milestone-id="completed"]').textContent, /Transfer complete/);
        await chooseMode(container, 'modal');
        assert.equal(container.querySelectorAll('[data-page2-modal]').length, scenario.milestones.length);
        const frameIds = [...container.querySelectorAll('[data-page2-modal]')].map(modal => modal.parentElement.id);
        assert.equal(new Set(frameIds).size, frameIds.length, 'each preview has its own widget and portal root');
        await chooseLayout(container, 'Timeline');
        assert.equal(container.querySelectorAll('[data-page2-preview]').length, 1);
        assert.equal(container.querySelector('#timeline-time').value, timelineTime);
        assert.equal(container.querySelector('#scenario-title').textContent, timelineTitle);
        assert.ok(container.querySelector('[data-page2-modal]'));
        assert.deepEqual(forbidden, []);
    } finally {
        await act(async () => root.unmount());
    }
});

test('canvas quote disclosures are independent and reset when the scenario changes', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    const expanded = card => card.querySelector('[data-value="quote"] [data-page2-quote-disclosure][aria-expanded]')?.getAttribute('aria-expanded') === 'true';
    try {
        await act(async () => root.render(React.createElement(TimelinePage)));
        await chooseLayout(container, 'Timeline');
        await act(async () => container.querySelector('[aria-label="See details"]').click());
        await chooseLayout(container, 'Canvas');
        const cards = [...container.querySelectorAll('[data-milestone-id]')];
        assert.equal(expanded(cards[0]), false, 'sequence starts from the fixture, independently of timeline disclosure');
        await act(async () => cards[0].querySelector('[aria-label="See details"]').click());
        assert.equal(expanded(cards[0]), true);
        assert.equal(expanded(cards[1]), false);
        await chooseMode(container, 'modal');
        assert.equal(expanded(container.querySelector('[data-milestone-id]')), true);
        await chooseLayout(container, 'Timeline');
        assert.equal(expanded(container), true, 'timeline disclosure survives a layout switch');
        await chooseLayout(container, 'Canvas');
        await chooseGroup(container, 'Page states');
        assert.deepEqual([...container.querySelectorAll('[data-milestone-id]')].map(card => card.dataset.milestoneId), ['loading', 'ready']);
        await chooseScenario(container, 'Swap not found');
        assert.deepEqual([...container.querySelectorAll('[data-milestone-id]')].map(card => card.dataset.milestoneId), ['loading', 'not-found']);
        await chooseGroup(container, 'Wallet transfers');
        assert.equal(expanded(container.querySelector('[data-milestone-id]')), false);
        assert.equal(container.querySelectorAll('[data-page2-modal]').length, scenarios[0].milestones.length);
        assert.deepEqual(forbidden, []);
    } finally {
        await act(async () => root.unmount());
    }
});

test('canvas uses dependent flow and scenario selectors while timeline keeps its sidebar', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    try {
        await act(async () => root.render(React.createElement(TimelinePage)));
        await chooseLayout(container, 'Timeline');
        assert.ok(container.querySelector('aside[aria-label="Scenarios"]'));
        assert.equal(container.querySelector('#timeline-scenario'), null);
        await chooseMode(container, 'modal');
        await chooseLayout(container, 'Canvas');
        assert.equal(container.querySelector('aside[aria-label="Scenarios"]'), null);
        assert.ok(container.querySelector('aside[aria-label="Canvas controls"]'));
        assert.equal(container.querySelector('#timeline-group').textContent, 'Wallet transfers');
        assert.equal(container.querySelector('#timeline-scenario').textContent, 'Successful wallet transfer');
        await chooseGroup(container, 'Token swaps');
        assert.equal(container.querySelector('#timeline-scenario').textContent, 'Approve, sign and confirm');
        const picker = container.querySelector('#timeline-scenario');
        await act(async () => picker.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
        const options = [...document.querySelectorAll('[role="option"]')];
        assert.deepEqual(options.map(option => option.textContent), scenarioGroups.find(group => group.id === 'token-swap').scenarios.map(scenario => scenario.label));
        await act(async () => options.find(option => option.textContent === 'Native token swap').dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Enter', bubbles: true})));
        assert.equal(container.querySelectorAll('[data-milestone-id]').length, 2);
        assert.equal(container.querySelectorAll('[data-page2-modal]').length, 2);
        await chooseLayout(container, 'Timeline');
        assert.equal(container.querySelector('#timeline-scenario'), null);
        assert.equal(container.querySelector('aside button[aria-pressed="true"]').getAttribute('aria-label'), 'Native token swap');
        assert.equal(container.querySelector('#scenario-title').textContent, 'Native token swap');
        await chooseLayout(container, 'Canvas');
        assert.equal(container.querySelector('#timeline-scenario').textContent, 'Native token swap');
        await chooseGroup(container, 'Manual deposits');
        assert.equal(container.querySelector('#timeline-scenario').textContent, 'Manual deposit from network');
        assert.deepEqual(forbidden, []);
    } finally {
        await act(async () => root.unmount());
    }
});

test('canvas fits, zooms, pans and focuses frames without remounting previews', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    const click = async label => {
        const button = [...container.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === label || button.textContent === label);
        assert.ok(button, label);
        await act(async () => button.click());
    };
    try {
        await act(async () => root.render(React.createElement(TimelinePage)));
        await chooseLayout(container, 'Canvas');
        const canvas = container.querySelector('[aria-label="Scenario canvas"]');
        const world = container.querySelector('[data-canvas-transform]');
        const content = world.querySelector('ol');
        const firstPreview = world.querySelector('[data-page2-preview]');
        Object.defineProperties(canvas, { clientWidth: {value: 1000}, clientHeight: {value: 700} });
        Object.defineProperties(content, { offsetWidth: {value: 1536}, offsetHeight: {value: 2500} });
        await click('Fit all');
        assert.equal(container.querySelector('[aria-label="Reset zoom to 100%"] ').textContent, '25%');
        await click('Reset zoom to 100%');
        const beforeZoom = world.style.transform;
        const wheel = new window.WheelEvent('wheel', {deltaY: -50, ctrlKey: true, clientX: 300, clientY: 200, bubbles: true, cancelable: true});
        await act(async () => canvas.dispatchEvent(wheel));
        assert.equal(wheel.defaultPrevented, true, 'zoom belongs to the canvas, not the browser');
        assert.notEqual(world.style.transform, beforeZoom);
        assert.equal(container.querySelector('[aria-label="Reset zoom to 100%"] ').textContent, '165%');
        await click('Zoom in');
        await click('Zoom in');
        assert.equal(container.querySelector('[aria-label="Zoom in"]').disabled, true, 'zoom is bounded');

        const beforePan = world.style.transform;
        await act(async () => canvas.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true})));
        assert.notEqual(world.style.transform, beforePan);
        const afterKeyPan = world.style.transform;
        canvas.setPointerCapture = () => {};
        canvas.hasPointerCapture = () => false;
        const pointer = (type, x, y) => {
            const event = new window.MouseEvent(type, {clientX:x, clientY:y, button:0, bubbles:true, cancelable:true});
            Object.defineProperties(event, {pointerId:{value:1}, pointerType:{value:'mouse'}});
            return event;
        };
        await act(async () => canvas.dispatchEvent(pointer('pointerdown', 20, 20)));
        await act(async () => canvas.dispatchEvent(pointer('pointermove', 90, 70)));
        await act(async () => canvas.dispatchEvent(pointer('pointerup', 90, 70)));
        assert.notEqual(world.style.transform, afterKeyPan);
        const afterDrag = world.style.transform;
        await act(async () => canvas.dispatchEvent(pointer('pointermove', 150, 150)));
        assert.equal(world.style.transform, afterDrag, 'released gestures stop panning');

        const frame = world.querySelector('[data-milestone-id]');
        Object.defineProperties(frame, { offsetWidth:{value:472}, offsetHeight:{value:750}, offsetLeft:{value:536}, offsetTop:{value:800} });
        await click('Focus step 1: Ready to send');
        assert.equal(container.querySelector('[aria-label="Reset zoom to 100%"] ').textContent, '85%');
        assert.equal(world.querySelector('[data-page2-preview]'), firstPreview);
        await click('Fit all');
        assert.equal(container.querySelector('[aria-label="Reset zoom to 100%"] ').textContent, '25%');
        await act(async () => frame.querySelector('h3').dispatchEvent(new window.MouseEvent('dblclick', {bubbles: true})));
        assert.equal(container.querySelector('[aria-label="Reset zoom to 100%"] ').textContent, '85%');
        await chooseOption(container, '#canvas-pages-per-row', '1');
        assert.equal(container.querySelector('[aria-label="Reset zoom to 100%"]').textContent, '25%', 'changing row size refits even after manual navigation');
        assert.equal(world.querySelector('[data-page2-preview]'), firstPreview, 'reflow preserves preview identity');
        assert.equal(content.style.gridTemplateColumns, 'repeat(1, 472px)');
        await chooseOption(container, '#canvas-pages-per-row', '9');
        assert.equal(content.style.gridTemplateColumns, 'repeat(9, 472px)');
        assert.deepEqual([...content.querySelectorAll('[data-milestone-id]')].map(card => card.dataset.milestoneId), scenarios[0].milestones.map(milestone => milestone.id));
        await chooseLayout(container, 'Timeline');
        assert.equal(container.querySelector('#canvas-pages-per-row'), null);
        await chooseLayout(container, 'Canvas');
        assert.equal(container.querySelector('#canvas-pages-per-row').textContent, '9');
        await chooseGroup(container, 'Page states');
        assert.equal(container.querySelector('#canvas-pages-per-row').textContent, '2', 'short scenarios use only the columns they need');
        await chooseGroup(container, 'Wallet transfers');
        assert.equal(container.querySelector('#canvas-pages-per-row').textContent, '9', 'short scenarios preserve the preferred row size');
        assert.deepEqual(forbidden, []);
    } finally {
        await act(async () => root.unmount());
    }
});

test('canvas preserves modal body wheel scrolling while keeping canvas pan and zoom', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    try {
        await act(async () => root.render(React.createElement(TimelinePage)));
        await chooseMode(container, 'modal');
        const canvas = container.querySelector('[aria-label="Scenario canvas"]');
        const world = container.querySelector('[data-canvas-transform]');
        const modal = canvas.querySelector('[data-page2-modal]');
        await act(async () => modal.querySelector('[aria-label="See details"]').click());
        const body = modal.querySelector('.styled-scroll');
        const target = [...body.querySelectorAll('button')].find(button => button.textContent === 'Close details');
        assert.ok(target, 'wheel input starts inside the expanded quote');
        // JSDOM has no layout or native scroll; supply overflow dimensions and
        // verify that the real modal event remains available to the browser.
        Object.defineProperties(body, {
            clientHeight: { value: 400 },
            scrollHeight: { value: 800, configurable: true },
        });
        const dispatchWheel = async (element, options = {}) => {
            const event = new window.WheelEvent('wheel', {
                deltaY: 80, bubbles: true, cancelable: true, ...options,
            });
            await act(async () => element.dispatchEvent(event));
            return event;
        };

        const beforeScroll = world.style.transform;
        for (const deltaY of [80, -80]) {
            const wheel = await dispatchWheel(target, { deltaY });
            assert.equal(wheel.defaultPrevented, false, 'overflowing modal keeps native scrolling');
            assert.equal(world.style.transform, beforeScroll, 'scrolling the modal does not pan the canvas');
        }
        for (const modifier of ['ctrlKey', 'metaKey']) {
            const beforeZoom = world.style.transform;
            const wheel = await dispatchWheel(target, { deltaY: -25, [modifier]: true });
            assert.equal(wheel.defaultPrevented, true, `${modifier} zoom still belongs to the canvas`);
            assert.notEqual(world.style.transform, beforeZoom);
        }
        const beforePan = world.style.transform;
        assert.equal((await dispatchWheel(canvas)).defaultPrevented, true);
        assert.notEqual(world.style.transform, beforePan, 'background wheel input still pans');

        Object.defineProperty(body, 'scrollHeight', { value: 400 });
        const beforeFittedBodyWheel = world.style.transform;
        assert.equal((await dispatchWheel(target)).defaultPrevented, true);
        assert.notEqual(world.style.transform, beforeFittedBodyWheel, 'a body without overflow keeps canvas gestures');
        assert.deepEqual(forbidden, []);
    } finally {
        await act(async () => root.unmount());
    }
});

test('the viewer hydrates shared selection controls without replacing server markup', async () => {
    const container = document.getElementById('root');
    const element = React.createElement(TimelinePage);
    const errors = [];
    container.innerHTML = renderToString(element);
    const serverPicker = container.querySelector('#timeline-group');
    let root;
    try {
        await act(async () => {
            root = hydrateRoot(container, element, {
                onRecoverableError: error => errors.push(error.message),
            });
        });
        assert.equal(container.querySelector('#timeline-group'), serverPicker);
        await chooseGroup(container, 'Token swaps');
        await chooseMode(container, 'modal');
        assert.equal(container.querySelector('#scenario-title').textContent, 'Approve, sign and confirm');
        assert.ok(container.querySelector('[data-page2-modal]'));
        assert.deepEqual(errors, []);
        assert.deepEqual(forbidden, []);
    } finally {
        if (root) await act(async () => root.unmount());
    }
});

test('viewer filters scenario groups, resets selections and preserves strictly earlier/later navigation', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    await act(async () => root.render(React.createElement(TimelinePage)));
        await chooseLayout(container, 'Timeline');
    const button = (label) =>
        [...container.querySelectorAll('button')].find(
            (b) => b.textContent === label,
        );
    const groupPicker = container.querySelector('#timeline-group');
    const visibleScenarios = () => [...container.querySelectorAll('aside button[aria-pressed]')].map(b => b.getAttribute('aria-label'));
    assert.equal(groupPicker.textContent, 'Wallet transfers');
    assert.deepEqual(visibleScenarios(), scenarioGroups[0].scenarios.map(s => s.label));
    assert.equal(button('← Previous').disabled, true);
    await act(async () => button('Next →').click());
    assert.equal(container.querySelector('input[type="range"]').value, '5');
    await chooseMode(container, 'modal');
    assert.equal(container.querySelector('input[type="range"]').value, '5');
    assert.ok(
        container.querySelector(
            '[role="dialog"][aria-label="Complete the swap"]',
        ),
    );
    await chooseMode(container, 'component');
    assert.equal(container.querySelector('input[type="range"]').value, '5');
    assert.equal(container.querySelector('[role="dialog"]'), null);
    await act(async () => button('← Previous').click());
    assert.equal(container.querySelector('input[type="range"]').value, '0');
    const failure = [...container.querySelectorAll('aside button[aria-pressed]')].find((b) =>
        b.textContent.startsWith('Output failure'),
    );
    await act(async () => failure.click());
    assert.equal(container.querySelector('input[type="range"]').value, '20');
    assert.equal(button('← Previous').disabled, true);
    assert.equal(
        container
            .querySelector('[aria-current="step"]')
            .textContent.includes('Confirming deposit'),
        true,
    );
    await chooseMode(container, 'modal');
    await chooseGroup(container, 'Wallet transfers');
    assert.equal(container.querySelector('#scenario-title').textContent, 'Output failure');
    await chooseGroup(container, 'Token swaps');
    for (const group of scenarioGroups) {
        await chooseGroup(container, group.label);
        const groupScenarios = group.scenarios;
        assert.deepEqual([...container.querySelectorAll('#timeline-scenarios h3')].map(heading => heading.textContent), group.sections.map(section => section.label));
        assert.equal(container.querySelector('#timeline-group-description').textContent, group.description);
        assert.deepEqual(visibleScenarios(), groupScenarios.map(s => s.label));
        assert.equal(container.querySelector('#scenario-title').textContent, groupScenarios[0].label);
        assert.equal(container.querySelector('input[type="range"]').value, String(groupScenarios[0].milestones[0].at));
        assert.equal(button('← Previous').disabled, true);
        assert.equal(container.querySelector('[role="tab"][aria-selected="true"]').textContent, 'Modal');
        if (!button('Next →').disabled) await act(async () => button('Next →').click());
    }
    await act(async () => root.unmount());
    assert.deepEqual(forbidden, []);
});

test('quote disclosures work in both modes and reset on timeline navigation without enabling swap actions', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    const previewElement = () => container.querySelector('[data-page2-preview]');
    const expanded = () =>
        previewElement().querySelector('[data-value="quote"] [data-page2-quote-disclosure][aria-expanded]')
            ?.getAttribute('aria-expanded') === 'true';
    const click = async (label, scope = container) => {
        const button = [...scope.querySelectorAll('button')].find(
            (b) => b.getAttribute('aria-label') === label || b.textContent === label,
        );
        assert.ok(button, label);
        await act(async () => (button.querySelector('span') ?? button).click());
    };
    const choose = async (label) => {
        const groupId = scenarios.find(s => s.label === label).group;
        const group = scenarioGroups.find(group => group.id === groupId).label;
        if (container.querySelector('#timeline-group').textContent !== group) await chooseGroup(container, group);
        const button = [...container.querySelectorAll('aside button[aria-pressed]')].find(
            (b) => b.getAttribute('aria-label') === label,
        );
        assert.ok(button, label);
        await act(async () => button.click());
    };
    const scrub = async seconds => {
        const slider = container.querySelector('#timeline-time');
        await act(async () => {
            Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(slider, String(seconds));
            slider.dispatchEvent(new window.Event('input', { bubbles: true }));
        });
        assert.equal(container.querySelector('output[for="timeline-time"]').textContent, `00:00:${String(seconds).padStart(2, '0')}`);
    };
    const selectMilestone = async seconds => {
        const button = [...container.querySelectorAll('[aria-label="Milestones"] button')].find(
            item => item.textContent.startsWith(`00:00:${String(seconds).padStart(2, '0')}`),
        );
        assert.ok(button, `milestone at ${seconds} seconds`);
        await act(async () => button.click());
        assert.equal(container.querySelector('#timeline-time').value, String(seconds));
    };
    try {
        await act(async () => root.render(React.createElement(TimelinePage)));
        await chooseLayout(container, 'Timeline');
        for (const mode of ['component', 'modal']) {
            await chooseMode(container, mode);
            await choose('Successful wallet transfer');
            await click('See details', previewElement());
            assert.equal(expanded(), true);
            assert.equal(container.querySelector('input[type="range"]').value, '0');
            await click('Close details', previewElement());
            assert.equal(expanded(), false);
            await click('See details', previewElement());

            // Opening details does not permit transaction, navigation or support actions.
            const before = previewElement().textContent;
            await act(async () => {
                for (const button of previewElement().querySelectorAll('button:not([data-page2-quote-disclosure])')) {
                    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
                    button.dispatchEvent(event);
                    assert.equal(event.defaultPrevented, true);
                }
            });
            assert.equal(previewElement().textContent, before);
            await click('Next →');
            assert.equal(expanded(), false);
            await click('← Previous');
            assert.equal(expanded(), false);

            await scrub(5);
            await click('See details', previewElement());
            await scrub(0);
            assert.equal(expanded(), false, 'slider rewind restores the earlier closed quote');
            await selectMilestone(5);
            await click('See details', previewElement());
            await selectMilestone(0);
            assert.equal(expanded(), false, 'milestone buttons restore the earlier closed quote');

            // These two scenarios share the same initial fixture and timestamp.
            await click('See details', previewElement());
            await choose('Quote update during preparation');
            assert.equal(expanded(), false);

            await choose('Manual deposit from network');
            await click('Next →');
            await click('Next →');
            assert.equal(expanded(), false);
            await click('See details', previewElement());
            assert.equal(expanded(), true);
            await click('Close details', previewElement());
            assert.equal(expanded(), false);
            await click('Next →');
            assert.equal(expanded(), true);
            await click('Close details', previewElement());
            await click('← Previous');
            assert.equal(expanded(), false);
            await click('Next →');
            assert.equal(expanded(), true);
            await click('Close details', previewElement());
            await scrub(12);
            await scrub(20);
            assert.equal(expanded(), true, 'slider navigation restores a snapshot whose quote starts open');
            await click('Close details', previewElement());
            await selectMilestone(12);
            await selectMilestone(20);
            assert.equal(expanded(), true, 'milestone navigation restores a snapshot whose quote starts open');
        }
        await chooseMode(container, 'component');
        assert.equal(expanded(), true);
        assert.equal(scenarios[0].milestones[0].snapshot.quoteState.expanded, false);
        assert.deepEqual(forbidden, []);
    } finally {
        await act(async () => root.unmount());
    }
});

test('recipient rows use the production identicon and controlled wallet, partner and saved-address visuals', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    const wallet = scenarios[0].milestones[0].snapshot;
    const manual = scenarios.find((s) => s.id === 'manual-network')
        .milestones.find((m) => m.id === 'address-ready').snapshot;
    try {
        await act(async () => root.render(React.createElement(ProductionAddressIcon, {
            address: wallet.swap.destination_address,
            network: wallet.swap.destination_network,
            size: 16,
        })));
        const liveIcon = container.querySelector('[data-address-icon] svg').outerHTML;
        assert.ok(liveIcon.includes('<rect'));
        for (const mode of ['component', 'modal']) {
            for (const snapshot of [wallet, manual]) {
                await act(async () => root.render(preview(snapshot, 12, mode)));
                const recipient = container.querySelector('[data-recipient-address]');
                assert.ok(recipient.textContent.includes('0x222'));
                assert.equal(recipient.querySelector('[data-address-icon] svg').outerHTML, liveIcon);
                const icon = recipient.querySelector('[data-address-icon]');
                assert.equal(icon.style.width, '16px');
                assert.equal(icon.style.height, '16px');

                await act(async () => root.render(preview({
                    ...snapshot,
                    recipient: { savedName: 'Sample recipient' },
                }, 12, mode)));
                assert.ok(container.querySelector('[data-recipient-address]').textContent.includes('Sample recipient'));
                assert.ok(container.querySelector('[data-address-icon] .lucide-user-round'));

                const partnerIcon = snapshot.swap.destination_network.logo;
                const walletIcon = snapshot.swap.source_network.logo;
                await act(async () => root.render(preview({
                    ...snapshot,
                    recipient: {
                        wallet: { id: 'sample', displayName: 'Sample wallet', icon: walletIcon },
                        partnerIcon,
                    },
                }, 12, mode)));
                assert.equal(container.querySelector('[data-recipient-address] img').getAttribute('alt'), 'Sample wallet');
                assert.equal(container.querySelector('[data-recipient-address] [data-address-icon]'), null);

                await act(async () => root.render(preview({ ...snapshot, recipient: { partnerIcon } }, 12, mode)));
                assert.equal(container.querySelector('[data-recipient-address] img').getAttribute('alt'), 'Partner logo');
                await act(async () => root.render(preview(snapshot, 12, mode)));
                assert.equal(container.querySelector('[data-recipient-address] [data-address-icon] svg').outerHTML, liveIcon);
            }
        }
        assert.deepEqual(forbidden, []);
    } finally {
        await act(async () => root.unmount());
    }
});

test('connected-wallet header uses controlled sample wallets without mounting live wallet controllers', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    const snapshot = scenarios[0].milestones[0].snapshot;
    try {
        await act(async () => root.render(preview({ ...snapshot, connectedWallets: [
            { id: 'one', displayName: 'Sample wallet one', icon: snapshot.swap.source_network.logo },
            { id: 'two', displayName: 'Sample wallet two', address: snapshot.sourceAddress },
            { id: 'three', displayName: 'Sample wallet three' },
        ] }, 0)));
        const header = container.querySelector('[aria-label="Connected wallets"]');
        assert.ok(header.querySelector('img[alt="Sample wallet one"]'));
        assert.ok(header.querySelector('[data-address-icon] svg'));
        assert.ok(header.textContent.includes('+1'));
        await act(async () => header.closest('button').click());
        assert.equal(container.querySelector('[role="dialog"]'), null);
        await act(async () => root.render(preview(snapshot, 0)));
        assert.equal(container.querySelector('[aria-label="Connected wallets"]'), null);
        assert.deepEqual(forbidden, []);
    } finally {
        await act(async () => root.unmount());
    }
});

test('production summary controller still supplies the shared view from its settings provider', async () => {
    const s = scenarios[0].milestones[0].snapshot;
    const container = document.getElementById('root');
    const root = createRoot(container);
    await act(async () =>
        root.render(
            React.createElement(
                SettingsStateContext.Provider,
                {
                    value: {
                        settings: {
                            networks: [
                                s.swap.source_network,
                                s.swap.destination_network,
                            ],
                        },
                        initialSettings: {},
                        isEmbedded: false,
                    },
                },
                React.createElement(ProductionSummary, {
                    swap: s.swap,
                    quote: { quote: s.quote },
                    sourceAccountAddress: s.sourceAddress,
                    receiveAmount: s.quote.receive_amount,
                    quoteIsLoading: false,
                }),
            ),
        ),
    );
    try {
        for (const value of ['Ethereum', 'Base', '100 USDC', '99 USDC'])
            assert.ok(container.textContent.includes(value), value);
    } finally {
        await act(async () => root.unmount());
    }
});

test('shared production wallet actions keep live callbacks outside the preview boundary', async () => {
    const root = createRoot(document.getElementById('root'));
    const calls = [];
    const click = async (text) => {
        const button = [...document.querySelectorAll('button')].find(
            (b) => b.textContent === text,
        );
        assert.ok(button, text);
        await act(async () => button.click());
    };
    try {
        await act(async () =>
            root.render(
                React.createElement(ConnectWalletView, {
                    onConnect: () => calls.push('connect'),
                }),
            ),
        );
        await click('Send from wallet');
        await act(async () =>
            root.render(
                React.createElement(SendTransactionView, {
                    handleClick: () => calls.push('send'),
                }),
            ),
        );
        await click('Swap now');
        await act(async () =>
            root.render(
                React.createElement(SendTransactionView, {
                    gaslessUnavailable: true,
                    gaslessFailureStage: 'deposit',
                    retryGasless: () => calls.push('retry'),
                    switchToStandard: () => calls.push('standard'),
                }),
            ),
        );
        await click('Try again');
        await click('Switch to standard transfer');
        for (const provider of ['Hyperliquid', 'Polymarket']) {
            await act(async () =>
                root.render(
                    React.createElement(SpecializedWithdrawalView, {
                        provider,
                        network:
                            scenarios[0].milestones[0].snapshot.swap
                                .source_network,
                        isConnected: true,
                        accountMismatch: false,
                        handleWithdraw: () => calls.push(provider),
                    }),
                ),
            );
            await click(`Withdraw from ${provider}`);
        }
        assert.deepEqual(calls, [
            'connect',
            'send',
            'retry',
            'standard',
            'Hyperliquid',
            'Polymarket',
        ]);
    } finally {
        await act(async () => root.unmount());
    }
});

test('shared gas, slippage, copy, network and confirmation controls retain production callbacks', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    const calls = [];
    const click = async (label) => {
        const button = [...container.querySelectorAll('button'), ...container.querySelectorAll('div[class*="cursor-pointer"]')].find((b) => b.textContent.trim() === label || b.getAttribute('aria-label') === label);
        assert.ok(button, label);
        await act(async () => button.click());
    };
    try {
        await act(async () => root.render(React.createElement(GasFeeView, {
            isGaslessCapable: true, gaslessEnabled: false, gasFeeInUsd: 0.005,
            setGaslessEnabled: (enabled) => calls.push(['gasless', enabled]),
        })));
        assert.ok(container.textContent.includes('<$0.01'));
        await click('Gasless transfer');

        function SlippageExample() {
            const [slippage, setSlippage] = React.useState(undefined);
            const [autoSlippage, setAutoSlippage] = React.useState(false);
            return React.createElement(SlippageView, { quoteData: scenarios[0].milestones[0].snapshot.quote, slippage, autoSlippage, setSlippage: (value) => { calls.push(['slippage', value]); setSlippage(value); }, setAutoSlippage });
        }
        await act(async () => root.render(React.createElement(SlippageExample)));
        await act(async () => container.querySelector('[data-attr="edit-slippage"]').click());
        await click('1.00%');
        assert.ok(container.textContent.includes('1.00'));
        await click('Auto');

        await act(async () => root.render(React.createElement(ChangeNetworkView, { network: 'Ethereum', onSwitch: () => calls.push(['network']) })));
        assert.ok(container.querySelector('button svg'));
        await click('Switch network');
        await act(async () => root.render(React.createElement(ManualDepositButtonView, { onCopy: () => calls.push(['deposit-copy']) })));
        await click('Copy deposit address');
        await act(async () => root.render(React.createElement(CopyButtonView, { handleCopyClick: () => calls.push(['inline-copy']) })));
        await act(async () => container.querySelector('button > div').click());
        await act(async () => root.render(React.createElement(ConfirmationContent, { submitText: 'Continue', dismissText: 'Cancel', onConfirm: () => calls.push(['confirm']), onDismiss: () => calls.push(['cancel']) })));
        await click('Continue');
        await click('Cancel');
        assert.deepEqual(calls, [['gasless', true], ['slippage', 0.01], ['slippage', undefined], ['network'], ['deposit-copy'], ['inline-copy'], ['confirm'], ['cancel']]);
        assert.deepEqual(forbidden, []);
    } finally {
        await act(async () => root.unmount());
    }
});

test('production slippage and snapshots render the same presenter, including high/custom warnings', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    const snapshot = scenarios[0].milestones[0].snapshot;
    const row = () => container.querySelector('[data-attr="edit-slippage"]').parentElement.parentElement;
    const signature = () => ({ text: row().textContent, classes: row().className, icons: [...row().querySelectorAll('svg')].map((e) => e.outerHTML) });
    try {
        await act(async () => root.render(React.createElement(ProductionSlippage, { quoteData: snapshot.quote, values: {} })));
        const production = signature();
        await act(async () => root.render(preview(snapshot, 0)));
        assert.deepEqual(signature(), production);
        await act(async () => root.render(preview({ ...snapshot, quoteState: { ...snapshot.quoteState, expanded: true, gaslessCapable: true, gasless: true, slippage: { slippage: 0.05, autoSlippage: false } } }, 0)));
        assert.ok(row().textContent.includes('High slippage'));
        assert.ok(row().textContent.includes('5.00%'));
        assert.equal(container.querySelector('[aria-label="Gasless transfer"]').getAttribute('aria-checked'), 'true');
        await act(async () => root.render(preview(snapshot, 0)));
        assert.deepEqual(signature(), production);
        assert.deepEqual(forbidden, []);
    } finally {
        await act(async () => root.unmount());
    }
});

const frontendMilestone = (scenario, milestone) => scenarios.find(s => s.id === scenario).milestones.find(m => m.id === milestone);
const fixtureDOM = (scenario, milestone) => {
    const m = frontendMilestone(scenario, milestone);
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(preview(m.snapshot, m.at));
    return container;
};

const processingElement = (s) => {
    const input = s.details.transactions.find(transaction => transaction.type === 'input');
    return React.createElement(ProcessingView, {
        swapBasicData: s.swap, swapDetails: s.details, refuel: s.refuel,
        resolved: phase(s), depositActions: s.depositActions, quote: s.quote,
        isDepositFlow: s.isDepositFlow,
        transactionHash: input?.transaction_hash || s.storedWalletTransaction?.hash,
        inputConfirmations: input?.confirmations,
        inputMaxConfirmations: input?.max_confirmations,
        elapsedTime: null, failedPanel: null,
    });
};

test('transaction icons belong to their steps and use the correct network and hash', () => {
    const cases = [
        ['wallet-success', 'publishing', [[0, 'input', 'source']]],
        ['wallet-success', 'completed', [[0, 'input', 'source'], [1, 'output', 'destination']]],
        ['frontend-permit2', 'input', [[2, 'input', 'source']]],
        ['frontend-permit2', 'completed', [[2, 'input', 'source'], [3, 'output', 'destination']]],
        ['refuel', 'complete', [[0, 'input', 'source'], [1, 'output', 'destination'], [2, 'refuel', 'destination']]],
        ['refund', 'refunded', [[0, 'input', 'source'], [2, 'refund', 'source']]],
    ];
    for (const [scenario, milestone, expected] of cases) {
        const original = frontendMilestone(scenario, milestone).snapshot;
        const snapshot = {
            ...original,
            swap: { ...original.swap,
                source_network: { ...original.swap.source_network, transaction_explorer_template: 'https://source.example.invalid/tx/{0}' },
                destination_network: { ...original.swap.destination_network, transaction_explorer_template: 'https://destination.example.invalid/tx/{0}' },
            },
            storedWalletTransaction: { ...original.storedWalletTransaction, hash: 'input/hash' },
            details: { ...original.details, transactions: original.details.transactions.map(transaction => ({
                ...transaction, transaction_hash: `${transaction.type}/hash`,
            })) },
        };
        const container = document.createElement('div');
        container.innerHTML = renderToStaticMarkup(processingElement(snapshot));
        const rows = container.querySelectorAll('li');
        assert.equal(container.querySelectorAll('[data-step-transaction]').length, expected.length, `${scenario}/${milestone}`);
        for (const [index, type, network] of expected) {
            const link = rows[index].querySelector('a[data-step-transaction]');
            assert.ok(link, `${scenario}/${milestone}/${type}`);
            assert.equal(link.href, `https://${network}.example.invalid/tx/${type}%2Fhash`);
            assert.equal(link.target, '_blank');
            assert.equal(link.rel, 'noopener noreferrer');
            assert.match(link.getAttribute('aria-label'), /^View transaction: .+/);
            assert.equal(link.textContent, '', 'the row uses an icon instead of an inline text link');
            assert.ok(link.querySelector('svg[aria-hidden="true"]'));
        }
        assert.doesNotMatch(container.textContent, /View in explorer|Transaction:/);
    }

    const original = frontendMilestone('wallet-success', 'completed').snapshot;
    for (const snapshot of [
        { ...original, details: { ...original.details, transactions: original.details.transactions.map(transaction => ({ ...transaction, transaction_hash: '' })) } },
        { ...original, swap: { ...original.swap,
            source_network: { ...original.swap.source_network, transaction_explorer_template: '' },
            destination_network: { ...original.swap.destination_network, transaction_explorer_template: '' },
        } },
    ]) {
        const container = document.createElement('div');
        container.innerHTML = renderToStaticMarkup(processingElement(snapshot));
        assert.equal(container.querySelector('[data-step-transaction]'), null, 'no icon without both a hash and explorer URL');
    }
});

test('transaction icons expose the View transaction tooltip on keyboard focus', async () => {
    const root = createRoot(document.getElementById('root'));
    try {
        await act(async () => root.render(processingElement(frontendMilestone('wallet-success', 'completed').snapshot)));
        const link = document.querySelector('a[data-step-transaction]');
        await act(async () => link.focus());
        assert.equal(document.querySelector('[role="tooltip"]').textContent, 'View transaction');
        assert.ok(link.getAttribute('aria-describedby'));
        await act(async () => link.blur());
        assert.equal(document.querySelector('[role="tooltip"]'), null);
    } finally {
        await act(async () => root.unmount());
    }
});

test('frontend wallet progress preserves completed steps, pending indicators and production presentation', () => {
    const progress = (milestone) => fixtureDOM('frontend-permit2', milestone).querySelector('[aria-label="Swap progress"]');
    const approving = progress('approving');
    assert.match(approving.textContent, /Step 1 of 4: Approve token/);
    assert.deepEqual([...approving.querySelectorAll('li')].map(li => li.textContent), ['Approve tokenApprove in your wallet', 'Sign to swap', 'Confirm swap', 'Receive 0.0396 ETH']);
    assert.equal(approving.querySelectorAll('.animate-spin').length, 1);
    assert.match(progress('approval-pending').textContent, /Confirming approval/);
    const signing = progress('signing');
    assert.equal(signing.querySelectorAll('.lucide-check').length, 1);
    assert.equal(signing.querySelectorAll('.animate-spin').length, 1);
    assert.match(signing.textContent, /Step 2 of 4: Sign to swap/);
    const publishing = progress('publishing');
    assert.equal(publishing.querySelectorAll('.lucide-check').length, 2);
    assert.match(publishing.textContent, /Step 3 of 4: Confirm swap/);

    const snapshot = frontendMilestone('frontend-permit2', 'signing').snapshot;
    const production = document.createElement('div');
    production.innerHTML = renderToStaticMarkup(React.createElement(SendTransactionView, {
        quote: snapshot.quote, depositActions: snapshot.depositActions,
        loading: snapshot.wallet.pending, actionStateText: snapshot.wallet.label,
    }));
    assert.equal(signing.outerHTML, production.querySelector('[aria-label="Swap progress"]').outerHTML);
    const submitted = fixtureDOM('frontend-approved', 'input');
    assert.ok(submitted.querySelector('[aria-label="Swap progress"]'));
    assert.match(submitted.textContent, /Confirming transaction/);
    assert.equal(phase(frontendMilestone('frontend-approved', 'input').snapshot).phase, SwapPhase.InputPending);
    assert.deepEqual(forbidden, []);
});

test('token swap timeline keeps wallet steps through confirmations and delivery', () => {
    const submitted = fixtureDOM('frontend-permit2', 'input').querySelector('[aria-label="Swap progress"]');
    assert.equal(submitted.querySelectorAll('li').length, 4);
    assert.equal(submitted.querySelectorAll('.lucide-check').length, 2);
    assert.match(submitted.textContent, /Step 3 of 4: Confirm swap/);
    assert.match(submitted.textContent, /Confirmations 3\/12/);
    assert.doesNotMatch(submitted.textContent, /\[object Object\]/);

    const finalizing = fixtureDOM('frontend-permit2', 'finalizing');
    assert.equal(finalizing.querySelectorAll('[aria-label="Swap progress"] .lucide-check').length, 3);
    assert.match(finalizing.textContent, /Step 4 of 4: Receive 0.0396 ETH/);
    assert.match(finalizing.textContent, /Sending to/);
    assert.equal(finalizing.querySelector('[aria-label="Swap complete"]'), null);

    const completed = fixtureDOM('frontend-permit2', 'completed');
    const card = completed.querySelector('[aria-label="Swap complete"]');
    assert.match(card.textContent, /Transfer complete/);
    assert.equal(card.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'), '100');
    assert.match(card.textContent, /Completed in 40s/);
    assert.doesNotMatch(card.textContent, /steps|quoted|Receipt|New swap/);
    assert.equal(completed.querySelector('[data-recipient-address]').closest('[hidden], [aria-hidden="true"], [inert]'), null);
    const steps = card.querySelector('[aria-label="Progress"]');
    assert.equal(steps.closest('[hidden], [aria-hidden="true"], [inert]'), null);
    assert.deepEqual([...steps.querySelectorAll('li')].map(li => li.textContent), [
        'Approve token', 'Sign to swap', 'Confirm swap', 'Received 0.0396 ETH',
    ]);
    assert.equal(steps.querySelectorAll('.lucide-check').length, 4);
    assert.equal(steps.querySelectorAll('.animate-spin').length, 0);
    assert.equal(card.querySelectorAll('button').length, 0);
    assert.equal(completed.querySelector('[aria-label="Swap progress"]'), null);
});

test('token swap keeps its inline gauge and header unchanged through completion', async () => {
    const root = createRoot(document.getElementById('root'));
    const input = frontendMilestone('frontend-permit2', 'input');
    const completed = frontendMilestone('frontend-permit2', 'completed');
    try {
        await act(async () => root.render(preview(input.snapshot, input.at)));
        const progressbar = document.querySelector('[role="progressbar"]');
        const gauge = progressbar.querySelector('svg');
        const summaryToken = document.querySelector('img[alt="Token Logo"]');
        const steps = document.querySelector('[aria-label="Progress"]');
        const recipient = document.querySelector('[data-recipient-address]');
        assert.equal(progressbar.getAttribute('aria-valuenow'), '50');
        assert.equal(gauge.getAttribute('width'), '32');
        assert.match(progressbar.parentElement.textContent, /Transfer in progress/);
        assert.ok(progressbar.parentElement.querySelector('[role="timer"]'));

        await act(async () => root.render(preview(completed.snapshot, completed.at)));
        assert.equal(document.querySelector('[role="progressbar"]'), progressbar);
        assert.equal(progressbar.querySelector('svg'), gauge);
        assert.equal(progressbar.getAttribute('aria-valuenow'), '100');
        assert.equal(gauge.getAttribute('width'), '32');
        assert.equal(progressbar.parentElement.querySelector('h3').textContent, 'Transfer complete');
        assert.equal(progressbar.parentElement.querySelector('[style*="transition"], [class*="animate-"], [class*="transition-"]'), null);
        assert.ok(progressbar.querySelector('.lucide-check'));
        assert.match(progressbar.parentElement.textContent, /Transfer completeCompleted in 40s/);
        assert.equal(document.querySelector('img[alt="Token Logo"]'), summaryToken);
        assert.equal(document.querySelector('[aria-label="Progress"]'), steps);
        assert.equal(steps.closest('[hidden], [aria-hidden="true"], [inert]'), null);
        assert.equal(steps.querySelectorAll('.lucide-check').length, 4);
        assert.equal(document.querySelector('[data-recipient-address]'), recipient);
        assert.equal(recipient.closest('[hidden], [aria-hidden="true"], [inert]'), null);
        assert.equal(document.querySelector('[role="timer"]'), null);

        // Rewinding reuses the same nodes and restores their in-progress statuses.
        await act(async () => root.render(preview(input.snapshot, input.at)));
        assert.equal(document.querySelector('[role="progressbar"]'), progressbar);
        assert.equal(document.querySelector('img[alt="Token Logo"]'), summaryToken);
        assert.equal(document.querySelector('[aria-label="Progress"]'), steps);
        assert.equal(steps.closest('[aria-hidden="true"]'), null);
        assert.equal(recipient.closest('[inert]'), null);
        assert.equal(document.querySelectorAll('[aria-label="Progress"]').length, 1);
    } finally {
        await act(async () => root.unmount());
    }
});

test('wallet execution exchanges the preparing button for persistent steps and respects reduced motion', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    const preparing = frontendMilestone('frontend-permit2', 'preparing');
    const approving = frontendMilestone('frontend-permit2', 'approving');
    const signing = frontendMilestone('frontend-permit2', 'signing');
    try {
        await act(async () => root.render(preview(preparing.snapshot, preparing.at)));
        assert.match(container.querySelector('[data-wallet-execution-panel="controls"]').textContent, /Preparing swap/);
        assert.equal(container.querySelector('[data-wallet-execution-panel="workflow"]'), null);

        await act(async () => root.render(preview(approving.snapshot, approving.at)));
        const workflow = container.querySelector('[data-wallet-execution-panel="workflow"]');
        const steps = workflow.querySelector('[aria-label="Progress"]');
        const panel = workflow.querySelector('[data-steps-panel]');
        assert.equal(panel.style.height, 'auto', 'reduced motion shows the final height immediately');
        assert.equal(panel.style.opacity, '1');
        assert.equal(workflow.style.height, '', 'the wallet wrapper does not run a second height animation');
        assert.equal(container.querySelector('[data-wallet-execution-panel="controls"]'), null, 'reduced motion removes the old button immediately');

        await act(async () => root.render(preview(signing.snapshot, signing.at)));
        assert.equal(container.querySelector('[data-wallet-execution-panel="workflow"]'), workflow);
        assert.equal(workflow.querySelector('[aria-label="Progress"]'), steps);
        assert.match(steps.textContent, /Sign in your wallet/);

        await act(async () => root.render(preview(preparing.snapshot, preparing.at)));
        assert.equal(container.querySelector('[data-wallet-execution-panel="workflow"]'), null);
        assert.match(container.querySelector('[data-wallet-execution-panel="controls"]').textContent, /Preparing swap/);
    } finally {
        await act(async () => root.unmount());
    }

    const initial = fixtureDOM('frontend-permit2', 'approving').querySelector('[data-steps-panel]');
    assert.equal(initial.style.height, 'auto', 'opening an existing workflow does not start it collapsed');
    assert.equal(initial.style.opacity, '1');
});

test('completed token swaps use the actual output and do not invent missing action history', async () => {
    const original = frontendMilestone('frontend-permit2', 'completed').snapshot;
    const snapshot = {
        ...original,
        depositActions: undefined,
        details: { ...original.details, transactions: original.details.transactions.map(transaction =>
            transaction.type === 'output' ? { ...transaction, amount: 0.0395 } : transaction) },
    };
    const container = document.getElementById('root');
    const root = createRoot(container);
    try {
        await act(async () => root.render(preview(snapshot, 90)));
        const card = container.querySelector('[aria-label="Swap complete"]');
        assert.match(container.textContent, /0\.0395 ETH/, 'summary shows the actual received amount');
        assert.match(card.textContent, /Transfer complete/);
        assert.equal(card.querySelector('[aria-label="Progress"]'), null, 'missing action history does not invent wallet steps');
        const transaction = card.querySelector('a[data-step-transaction]');
        assert.equal(transaction.getAttribute('aria-label'), 'View transaction');
        assert.equal(transaction.hasAttribute('href'), false, 'preview transaction links remain read-only');
        assert.doesNotMatch(card.textContent, /4 of 4/);

        await act(async () => root.render(preview({ ...snapshot, depositActions: original.depositActions }, 90)));
        const steps = container.querySelector('[aria-label="Progress"]');
        assert.match(steps.textContent, /Received 0\.0395 ETH/);
        assert.doesNotMatch(steps.textContent, /0\.0396 ETH/);
        assert.equal(steps.querySelectorAll('.lucide-check').length, 4);
    } finally {
        await act(async () => root.unmount());
    }
});

test('token swaps retain the refuel amount and receipt when delivery completes', async () => {
    const native = frontendMilestone('frontend-native', 'publishing').snapshot;
    const refuelComplete = frontendMilestone('refuel', 'complete').snapshot;
    const snapshot = {
        ...native,
        refuel: refuelComplete.refuel,
        details: {
            ...refuelComplete.details,
            transactions: refuelComplete.details.transactions.map(transaction => ({
                ...transaction,
                amount: transaction.type === 'input' ? Number(native.swap.requested_amount) : transaction.amount,
                transaction_hash: `${transaction.type}/hash`,
            })),
        },
    };
    const container = document.getElementById('root');
    const root = createRoot(container);
    try {
        for (const depositActions of [
            native.depositActions.map(action => ({ ...action, status: 'completed' })),
            undefined,
        ]) {
            const completed = { ...snapshot, depositActions };
            const pending = {
                ...completed,
                details: {
                    ...completed.details,
                    transactions: completed.details.transactions.filter(transaction => transaction.type !== 'refuel'),
                },
            };
            assert.equal(phase(pending).phase, SwapPhase.SettlingOutput);
            await act(async () => root.render(processingElement(pending)));
            assert.match(container.querySelectorAll('li')[2].textContent, /Sending ETH to your address/);

            assert.equal(phase(completed).phase, SwapPhase.Completed);
            await act(async () => root.render(processingElement(completed)));
            const rows = container.querySelectorAll('li');
            assert.equal(rows.length, 3, 'deposit, output and refuel remain visible with or without wallet action history');
            const refuelRow = rows[2];
            assert.equal(refuelRow.textContent, `${snapshot.refuel.amount} ${snapshot.refuel.token.asset} was sent to your address`);
            const link = refuelRow.querySelector('a[data-step-transaction]');
            assert.equal(link.href, 'https://explorer.example.invalid/tx/refuel%2Fhash');
            assert.equal(link.target, '_blank');
            assert.ok(refuelRow.querySelector('.lucide-check'), 'the delivered refuel is marked complete');
        }
    } finally {
        await act(async () => root.unmount());
    }
});

test('frontend snapshots keep automatic wallet execution busy until processing or a real interruption', () => {
    for (const scenario of scenarios.filter(s => s.group === 'token-swap')) {
        for (const milestone of scenario.milestones) {
            const s = milestone.snapshot;
            const wallet = s.wallet;
            if (!s.depositActions?.length || !phase(s).showWithdrawScreen || wallet?.kind !== 'send') continue;
            if (wallet.error || wallet.swapError || wallet.gaslessUnavailable || wallet.critical === 'confirmation') continue;

            const label = `${scenario.id}/${milestone.id}`;
            assert.equal(wallet.pending, true, `${label}: automatic execution never becomes idle between wallet prompts`);
            const container = document.createElement('div');
            container.innerHTML = renderToStaticMarkup(React.createElement(SendTransactionView, {
                quote: s.quote, depositActions: s.depositActions, loading: wallet.pending, actionStateText: wallet.label,
            }));
            const buttons = [...container.querySelectorAll('button')];
            if (s.depositActions.filter(action => action.step).length > 1 || s.depositActions.some(action => action.step === 'publish')) {
                assert.equal(buttons.length, 0, `${label}: multistep execution has no intermediate action button`);
            } else {
                assert.equal(buttons.length, 1, label);
                assert.ok(buttons[0].disabled, `${label}: the single-step submitting button is disabled`);
            }
        }
    }
});

test('frontend quotes match the real full-to-compact lifecycle and sign-only/native variants', () => {
    const ready = fixtureDOM('frontend-permit2', 'ready');
    assert.ok(ready.querySelector('[aria-label="See details"]'));
    assert.equal(ready.querySelector('[data-quote-layout]').dataset.quoteLayout, 'separate');
    for (const milestone of ['approving', 'signing', 'input', 'finalizing', 'completed']) {
        const view = fixtureDOM('frontend-permit2', milestone);
        assert.match(view.textContent, /Send to/);
        assert.ok(view.querySelector('[data-recipient-address]'));
        assert.equal(view.querySelector('[data-quote-layout]').dataset.quoteLayout, 'attached');
        assert.ok(view.querySelector('[aria-label="See details"]').closest('[aria-hidden="true"][inert]'));
        assert.ok(view.querySelector('[data-attr="edit-slippage"]').closest('[aria-hidden="true"][inert]'));
    }
    assert.equal(fixtureDOM('frontend-permit2', 'completed').querySelector('[data-recipient-address]').closest('[hidden], [aria-hidden="true"], [inert]'), null);
    const gasless = fixtureDOM('frontend-gasless', 'gasless');
    assert.ok(gasless.querySelector('[aria-label="See details"]'));
    assert.equal(gasless.querySelector('[data-quote-layout]').dataset.quoteLayout, 'separate');
    assert.equal(fixtureDOM('wallet-success', 'ready').querySelector('[data-quote-layout]').dataset.quoteLayout, 'separate');
    assert.equal(gasless.querySelector('[aria-label="Swap progress"]'), null);
    assert.match(fixtureDOM('frontend-native', 'ready').textContent, /Swap now/);
    assert.match(fixtureDOM('frontend-native', 'publishing').textContent, /Step 1 of 2: Confirm swap/);
    assert.match(fixtureDOM('frontend-native', 'publishing').textContent, /Confirm in your wallet/);
    assert.match(fixtureDOM('frontend-critical', 'critical').textContent, /receive as low as 0.03 ETH/);
});

test('compacting and attaching preserves one quote and recipient through repeated reversals', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    const ready = frontendMilestone('frontend-permit2', 'ready');
    const approving = frontendMilestone('frontend-permit2', 'approving');
    try {
        await act(async () => root.render(preview(ready.snapshot, ready.at)));
        const overview = container.querySelector('[data-quote-layout]');
        const summaryToken = overview.querySelector('img[alt="Token Logo"]');
        const recipient = overview.querySelector('[data-recipient-address]');
        const disclosure = overview.querySelector('[aria-label="See details"]');
        for (const milestone of [approving, ready, approving, ready]) {
            await act(async () => root.render(preview(milestone.snapshot, milestone.at)));
            const compact = milestone === approving;
            assert.equal(container.querySelector('[data-quote-layout]'), overview);
            assert.equal(overview.dataset.quoteLayout, compact ? 'attached' : 'separate');
            assert.equal(overview.querySelector('img[alt="Token Logo"]'), summaryToken);
            assert.equal(overview.querySelector('[data-recipient-address]'), recipient);
            assert.equal(overview.querySelector('[aria-label="See details"]'), disclosure);
            assert.equal(overview.querySelectorAll('[data-recipient-address]').length, 1);
            assert.equal(!!disclosure.closest('[aria-hidden="true"][inert]'), compact);
        }
    } finally {
        await act(async () => root.unmount());
    }
});

test('standard quotes compact and attach through completion while preserving recipient and quote identity', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    try {
        for (const scenarioId of ['wallet-success', 'gasless-success', 'refuel']) {
            const scenario = scenarios.find(s => s.id === scenarioId);
            const ready = scenario.milestones.find(m => phase(m.snapshot).showWithdrawScreen);
            const processing = scenario.milestones.find(m => !phase(m.snapshot).showWithdrawScreen);
            for (const mode of ['component', 'modal']) {
                await act(async () => root.render(preview(ready.snapshot, ready.at, mode)));
                const overview = container.querySelector('[data-quote-layout]');
                const quote = overview.querySelector('[data-quote-transition]');
                const disclosure = quote.querySelector('[aria-label="See details"]');
                const summaryToken = overview.querySelector('img[alt="Token Logo"]');
                assert.ok(disclosure);
                for (const milestone of [processing, ready, processing, scenario.milestones.at(-1), ready]) {
                    await act(async () => root.render(preview(milestone.snapshot, milestone.at, mode)));
                    const compact = !phase(milestone.snapshot).showWithdrawScreen;
                    assert.equal(container.querySelector('[data-quote-layout]'), overview);
                    assert.equal(overview.dataset.quoteLayout, compact ? 'attached' : 'separate');
                    assert.equal(overview.querySelector('img[alt="Token Logo"]'), summaryToken);
                    assert.equal(overview.querySelector('[data-quote-transition]'), quote);
                    assert.equal(quote.querySelector('[aria-label="See details"]'), disclosure);
                    assert.equal(quote.closest('[hidden], [inert], [aria-hidden="true"]'), null);
                    assert.equal(!!disclosure.closest('[aria-hidden="true"][inert]'), compact);
                    const recipient = quote.querySelector('[data-recipient-address]');
                    assert.ok(recipient);
                    assert.equal(recipient.closest('[hidden], [inert], [aria-hidden="true"]'), null);
                    const minimum = [...quote.querySelectorAll('label')].find(label => label.textContent === 'Receive at least');
                    assert.ok(minimum);
                    assert.equal(minimum.closest('[hidden], [inert], [aria-hidden="true"]'), null);
                    assert.equal(container.querySelectorAll('[data-quote-transition]').length, 1);
                    assert.equal(container.querySelectorAll('[data-steps-panel]').length, compact ? 1 : 0);
                }
            }
        }
    } finally {
        await act(async () => root.unmount());
    }
});

test('manual network and exchange deposits use the shared instructions-to-progress transition in both modes', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    try {
        for (const scenarioId of ['manual-network', 'manual-exchange']) {
            const ready = frontendMilestone(scenarioId, 'address-ready');
            const detected = frontendMilestone(scenarioId, 'deposit-detected');
            for (const mode of ['component', 'modal']) {
                for (const milestone of [ready, detected, ready, detected]) {
                    await act(async () => root.render(preview(milestone.snapshot, milestone.at, mode)));
                    const processing = milestone === detected;
                    const overview = container.querySelector('[data-wallet-execution-panel="overview"]');
                    const controls = container.querySelector('[data-wallet-execution-panel="controls"]');
                    const steps = container.querySelector('[data-steps-panel]');
                    assert.equal(!!overview, processing);
                    assert.equal(!!steps, processing);
                    assert.equal(!!controls, !processing);
                    if (processing) {
                        assert.equal(overview.style.height, 'auto');
                        assert.equal(steps.style.height, 'auto');
                        assert.match(steps.textContent, /Processing your deposit/);
                        assert.doesNotMatch(container.textContent, /Copy the deposit address/);
                    } else {
                        assert.match(controls.textContent, /Copy the deposit address/);
                        assert.equal(controls.closest('[inert]'), null);
                    }
                }
            }
        }
    } finally {
        await act(async () => root.unmount());
    }
});

test('gasless failure reasons replace the generic failed-step description without a separate message', async () => {
    const root = createRoot(document.getElementById('root'));
    const reasons = {
        expired: 'The deposit authorization expired before it was broadcast.',
        insufficient: 'Your balance is insufficient to complete this deposit.',
        rejected: 'The deposit was rejected.',
    };
    try {
        for (const mode of ['component', 'modal']) {
            for (const [status, reason] of Object.entries(reasons)) {
                const milestone = frontendMilestone(`gasless-${status}`, 'failed');
                await act(async () => root.render(preview(milestone.snapshot, milestone.at, mode)));
                const container = document.getElementById('root');
                const failedStep = container.querySelector('[aria-label="Progress"] li');
                assert.equal(failedStep.textContent, `The transfer failed${reason}`);
                assert.equal(container.textContent.split(reason).length - 1, 1, 'show the specific reason only once');
                assert.doesNotMatch(container.textContent, /Something went wrong while processing|please contact our support|Gasless deposit failed/);
                const actions = container.querySelector('[data-processing-actions]');
                assert.equal(actions.textContent, 'Try againSwitch to standard transfer', 'retry area contains only its actions');
            }
            const retry = frontendMilestone('gasless-expired', 'retry');
            await act(async () => root.render(preview(retry.snapshot, retry.at, mode)));
            assert.doesNotMatch(document.getElementById('root').textContent, /The deposit was rejected|The deposit authorization expired|Your balance is insufficient/);
        }
    } finally {
        await act(async () => root.unmount());
    }
});

test('unknown failures keep the generic support message and working support action', async () => {
    const root = createRoot(document.getElementById('root'));
    const input = frontendMilestone('input-failure', 'failed').snapshot;
    const withoutHash = {
        ...input,
        storedWalletTransaction: { ...input.storedWalletTransaction, hash: '' },
        details: { ...input.details, transactions: input.details.transactions.map(transaction => ({ ...transaction, transaction_hash: '' })) },
    };
    let supportCalls = 0;
    try {
        for (const snapshot of [input, withoutHash, frontendMilestone('output-failure', 'failed').snapshot]) {
            await act(async () => root.render(React.cloneElement(processingElement(snapshot), {
                onGetHelp: () => supportCalls++,
                inputFailureMessage: gaslessFailureMessage(undefined),
            })));
            const container = document.getElementById('root');
            assert.match(container.textContent, /Something went wrong while processing the transfer\./);
            const support = [...container.querySelectorAll('span')].find(span => span.textContent.trim() === 'please contact our support.');
            assert.ok(support.closest('li'), 'support stays in the failed step');
            await act(async () => support.click());
        }
        assert.equal(supportCalls, 3);
        assert.equal(gaslessFailureMessage(undefined), undefined, 'missing reasons use the shared fallback');
        assert.equal(gaslessFailureMessage('unknown'), undefined, 'unrecognized reasons use the shared fallback');
    } finally {
        await act(async () => root.unmount());
    }
});

test('frontend rejection and failed-step fixtures distinguish signature errors from transaction errors', () => {
    for (const [step, message] of [['approve_permit2', 'Transaction rejected'], ['sign', 'Signing rejected'], ['publish', 'Transaction rejected']]) {
        const rejected = fixtureDOM(`frontend-${step}-retry`, 'rejected');
        assert.match(rejected.textContent, new RegExp(message));
        assert.equal(rejected.querySelectorAll('[aria-label="Swap progress"] .lucide-x').length, 1);
        const steps = rejected.querySelector('[data-steps-panel]');
        const error = rejected.querySelector('[data-wallet-action-message]');
        const retry = [...rejected.querySelectorAll('button')].find(button => button.textContent === 'Try again');
        assert.match(error.textContent, new RegExp(message));
        assert.ok(steps.compareDocumentPosition(error) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING, 'error appears after the steps');
        assert.ok(error.compareDocumentPosition(retry) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING, 'error appears before the retry button');
        assert.equal(rejected.querySelectorAll('[data-wallet-action-message]').length, 1);
        const refresh = fixtureDOM(`frontend-${step}-retry`, 'refresh');
        assert.match(refresh.textContent, /Refreshing swap/);
        assert.equal(refresh.querySelectorAll('[aria-label="Swap progress"] .lucide-x').length, 0);
    }
    assert.match(fixtureDOM('frontend-errors', 'failed').textContent, /Token approval reverted/);
    const pending = fixtureDOM('frontend-errors', 'pending-error').querySelector('[aria-label="Swap progress"]');
    assert.equal(pending.querySelectorAll('.lucide-x').length, 0);
    assert.equal(pending.querySelectorAll('.animate-spin').length, 1);
});

test('production critical-amount confirmation resumes through its dedicated callback', async () => {
    const root = createRoot(document.getElementById('root'));
    const calls = [];
    try {
        await act(async () => root.render(React.createElement(SendTransactionView, {
            showCriticalMarketPriceImpactButtons: true,
            depositActions: frontendMilestone('frontend-critical', 'critical').snapshot.depositActions,
            handleClick: () => calls.push('start'),
            handleCriticalContinue: () => calls.push('continue'),
        })));
        const button = [...document.querySelectorAll('button')].find(b => b.textContent === 'Continue anyway');
        await act(async () => button.click());
        assert.deepEqual(calls, ['continue']);
    } finally {
        await act(async () => root.unmount());
    }
});

test.after(() => {
    globalThis.setInterval = originalInterval;
    dom.window.close();
    rmSync(temporary, { recursive: true, force: true });
});
