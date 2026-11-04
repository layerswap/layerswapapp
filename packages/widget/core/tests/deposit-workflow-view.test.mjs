import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'

const dom = new JSDOM('<div id="root"></div>', { url: 'https://widget.example' })
const previous = Object.getOwnPropertyDescriptors(globalThis)
const surfaces = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    SVGElement: dom.window.SVGElement,
    IS_REACT_ACT_ENVIRONMENT: true,
}
for (const [key, value] of Object.entries(surfaces)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
dom.window.matchMedia = () => ({
    matches: true,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
})
const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
            return nextResolve(`${specifier}.js`, context)
        }
        return nextResolve(specifier, context)
    },
})
const { createRoot } = await import('react-dom/client')
const { DepositWorkflowView } = await import('../dist/esm/components/Pages/Swap/Withdraw/Presentation/DepositWorkflowView.js')
const { ProgressStatus } = await import('../dist/esm/components/Pages/Swap/Withdraw/Processing/types.js')
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/atomic-batch.json', import.meta.url)))
const container = document.getElementById('root')
const props = {
    destinationToken: { asset: 'USDT', decimals: 6 },
    receiveAmount: 2.660824,
}
const rows = () => [...container.querySelectorAll('[aria-label="Progress"] li')]
const names = () => rows().map(row => row.querySelector('.font-medium').textContent)
const processing = {
    inputStatus: ProgressStatus.Current,
    outputStatus: ProgressStatus.Upcoming,
    inputDescription: 'Confirming transaction',
}
const completed = { completionTime: null, explorerUrl: 'https://basescan.org/tx/receipt' }

after(() => {
    hooks.deregister()
    dom.window.close()
    for (const key of Object.keys(surfaces)) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
        else delete globalThis[key]
    }
})

for (const name of ['zero_allowance', 'allowance_reset', 'sufficient_allowance']) {
    test(`${name} keeps two timeline steps when the backend replaces calls with status placeholders`, async () => {
        const root = createRoot(container)
        const label = name === 'sufficient_allowance' ? 'Confirm swap' : 'Approve and swap'
        const rawActions = fixtures.deposit_actions[name]
        const placeholders = status => rawActions.map(action => ({
            step: action.step,
            status: action.step === 'approve' ? 'completed' : status,
        }))
        try {
            await act(() => root.render(createElement(DepositWorkflowView, {
                ...props, actions: [fixtures.actions[name]], loading: true,
            })))
            assert.deepEqual(names(), [label, 'Receive 2.660824 USDT'])

            await act(() => root.render(createElement(DepositWorkflowView, {
                ...props, actions: placeholders('pending'), processing,
            })))
            assert.deepEqual(names(), [label, 'Receive 2.660824 USDT'])
            assert.ok(rows()[0].querySelector('.animate-spin'))
            assert.match(rows()[0].textContent, /Confirming transaction/)

            await act(() => root.render(createElement(DepositWorkflowView, {
                ...props, actions: placeholders('completed'), completed,
            })))
            assert.deepEqual(names(), [label, 'Received 2.660824 USDT'])
            assert.equal(container.querySelectorAll('[aria-label="Progress"] .lucide-check').length, 2)
            assert.equal(container.querySelectorAll('.animate-spin').length, 0)
            assert.equal(rows()[0].querySelector('a'), null)
            assert.equal(rows()[1].querySelector('a').getAttribute('href'), completed.explorerUrl)
            assert.match(container.textContent, /Transfer complete/)
        } finally { await act(() => root.unmount()) }
    })
}

test('a completed atomic swap opened without prior action history still has two steps', async () => {
    const root = createRoot(container)
    try {
        await act(() => root.render(createElement(DepositWorkflowView, {
            ...props,
            actions: [{ step: 'approve', status: 'completed' }, { step: 'publish', status: 'completed' }],
            completed,
        })))
        assert.deepEqual(names(), ['Approve and swap', 'Received 2.660824 USDT'])
    } finally { await act(() => root.unmount()) }
})

test('separate Permit2 approval, signing and publication retain their four timeline steps', async () => {
    const root = createRoot(container)
    try {
        await act(() => root.render(createElement(DepositWorkflowView, {
            ...props,
            actions: ['approve_permit2', 'sign', 'publish'].map(step => ({ step, status: 'completed' })),
            completed,
        })))
        assert.deepEqual(names(), ['Approve token', 'Sign to swap', 'Confirm swap', 'Received 2.660824 USDT'])
    } finally { await act(() => root.unmount()) }
})
