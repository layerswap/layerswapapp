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
import { createRoot, hydrateRoot } from 'react-dom/client';

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

// Bundle the actual package export, using the same workspace package boundaries as Next.
const result = await build({
    stdin: {
        contents: `export { Page2Preview, resolveSwapPhase, SwapPhase } from '@layerswap/widget/internal';
        export { scenarios, EPOCH } from './features/timeline/fixtures';
        export { selectTime, selectScenario } from './features/timeline/model';
        export { default as TimelinePage } from './pages/timeline.dev.mjs';
        export { default as App } from './pages/_app';
        export { SendTransactionView, ConnectWalletView } from '../../packages/widget/core/dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletActionsView.js';
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
    EPOCH,
    selectTime,
    selectScenario,
    TimelinePage,
    App,
    SendTransactionView,
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
                    assert.equal(
                        confirmation.parentElement.id,
                        'page2-preview-widget',
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

test('viewer controls reset scenarios and preserve strictly earlier/later navigation', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    await act(async () => root.render(React.createElement(TimelinePage)));
    const button = (label) =>
        [...container.querySelectorAll('button')].find(
            (b) => b.textContent === label,
        );
    assert.equal(button('← Previous').disabled, true);
    await act(async () => button('Next →').click());
    assert.equal(container.querySelector('input[type="range"]').value, '5');
    await act(async () =>
        container.querySelector('input[value="modal"]').click(),
    );
    assert.equal(container.querySelector('input[type="range"]').value, '5');
    assert.ok(
        container.querySelector(
            '[role="dialog"][aria-label="Complete the swap"]',
        ),
    );
    await act(async () =>
        container.querySelector('input[value="component"]').click(),
    );
    assert.equal(container.querySelector('input[type="range"]').value, '5');
    assert.equal(container.querySelector('[role="dialog"]'), null);
    await act(async () => button('← Previous').click());
    assert.equal(container.querySelector('input[type="range"]').value, '0');
    const failure = [...container.querySelectorAll('aside button')].find((b) =>
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
    await act(async () => root.unmount());
    assert.deepEqual(forbidden, []);
});

test('quote disclosures work in both modes and reset on timeline navigation without enabling swap actions', async () => {
    const container = document.getElementById('root');
    const root = createRoot(container);
    const previewElement = () => container.querySelector('[data-page2-preview]');
    const expanded = () =>
        previewElement().querySelector('[data-value="quote"] [aria-expanded]')
            ?.getAttribute('aria-expanded') === 'true';
    const click = async (label, scope = container) => {
        const button = [...scope.querySelectorAll('button')].find(
            (b) => b.getAttribute('aria-label') === label || b.textContent === label,
        );
        assert.ok(button, label);
        await act(async () => (button.querySelector('span') ?? button).click());
    };
    const choose = async (label) => {
        const button = [...container.querySelectorAll('aside button')].find(
            (b) => b.firstElementChild.textContent === label,
        );
        assert.ok(button, label);
        await act(async () => button.click());
    };
    try {
        await act(async () => root.render(React.createElement(TimelinePage)));
        for (const mode of ['component', 'modal']) {
            await act(async () => container.querySelector(`input[value="${mode}"]`).click());
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
        }
        await act(async () => container.querySelector('input[value="component"]').click());
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

test.after(() => {
    globalThis.setInterval = originalInterval;
    dom.window.close();
    rmSync(temporary, { recursive: true, force: true });
});
