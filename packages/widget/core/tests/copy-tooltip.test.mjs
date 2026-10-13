import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://widget.example',
    pretendToBeVisual: true,
})
const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    CustomEvent: dom.window.CustomEvent,
    MutationObserver: dom.window.MutationObserver,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
}
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
            for (const suffix of ['.js', '.jsx', '/index.js']) {
                const url = new URL(`${specifier}${suffix}`, context.parentURL)
                if (existsSync(url)) return nextResolve(url.href, context)
            }
        }
        return nextResolve(specifier, context)
    },
    load(url, context, nextLoad) {
        if (url.includes('/dist/esm/') && url.endsWith('.jsx')) {
            return { source: readFileSync(new URL(url), 'utf8'), format: 'module', shortCircuit: true }
        }
        return nextLoad(url, context)
    },
})

const { createRoot } = await import('react-dom/client')
const { default: CopyButton } = await import('../../../ui-kit/dist/esm/buttons/CopyButton.js')
const { Tooltip, TooltipTrigger, TooltipContent } = await import('../../../ui-kit/dist/esm/shadcn/tooltip.js')

let container
let root
let copied
beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    copied = []
    document.execCommand = command => {
        assert.equal(command, 'copy')
        copied.push(document.getSelection().toString())
        return true
    }
})
afterEach(async () => {
    await act(() => root.unmount())
    container.remove()
})
after(() => {
    hooks.deregister()
    dom.window.close()
    for (const key of Object.keys(globals)) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
        else delete globalThis[key]
    }
})

test('copying a wallet link opens its Copied confirmation without hover', async () => {
    await act(() => root.render(createElement(CopyButton, { toCopy: 'wc:wallet-link' }, 'Copy link')))
    assert.equal(document.querySelector('[role="tooltip"]'), null)

    await act(() => container.querySelector('button > div').click())

    assert.deepEqual(copied, ['wc:wallet-link'])
    assert.equal(document.querySelector('[role="tooltip"]')?.textContent, 'Copied')
})

const renderTooltip = props => act(() => root.render(createElement(Tooltip, props,
    createElement(TooltipTrigger, null, 'Details'),
    createElement(TooltipContent, null, 'Wallet details'),
)))

test('a controlled tooltip follows external visibility changes', async () => {
    await renderTooltip({ open: false })
    assert.equal(document.querySelector('[role="tooltip"]'), null)
    await renderTooltip({ open: true })
    assert.equal(document.querySelector('[role="tooltip"]')?.textContent, 'Wallet details')
    await renderTooltip({ open: false })
    assert.equal(document.querySelector('[role="tooltip"]'), null)
})

test('click-to-open tooltips still toggle their own visibility', async () => {
    await renderTooltip({ openOnClick: true })
    await act(() => container.querySelector('button').click())
    assert.equal(document.querySelector('[role="tooltip"]')?.textContent, 'Wallet details')
    await act(() => container.querySelector('button').click())
    assert.equal(document.querySelector('[role="tooltip"]'), null)
})
