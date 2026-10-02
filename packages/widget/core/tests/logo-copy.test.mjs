import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode } from 'react'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true }
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}

const moduleUrl = source => 'data:text/javascript,' + encodeURIComponent(source)
// Keep the real logos and serialization; replace only the menu and clipboard UI.
const menu = moduleUrl(`
  import { createElement } from ${JSON.stringify(import.meta.resolve('react'))}
  const Wrapper = ({ children }) => createElement('div', null, children)
  export { Wrapper as Root, Wrapper as Trigger, Wrapper as Content, Wrapper as ContextMenuItem }
`)
const clipboard = moduleUrl(`
  import { createElement } from ${JSON.stringify(import.meta.resolve('react'))}
  export const copied = []
  export const CopyButton = ({ children, toCopy, disabled }) => createElement('button', {
    disabled, onClick: () => copied.push(toCopy),
  }, children)
`)
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  // A server renderer in this browser component crashes hosts running a
  // different React patch version from the CDN build (React error #527).
  if (specifier.startsWith('react-dom/server')) throw new Error('Logo copying must not load a server renderer')
  if (specifier === '@layerswap/ui-kit/components') return { url: clipboard, shortCircuit: true }
  if (specifier === '@radix-ui/react-context-menu') return { url: menu, shortCircuit: true }
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
    return nextResolve(`${specifier}.js`, context)
  }
  return nextResolve(specifier, context)
} })

after(() => {
  hooks.deregister()
  dom.window.close()
  for (const key of Object.keys(globals)) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
    else delete globalThis[key]
  }
})

const { createRoot } = await import('react-dom/client')
const { default: LogoWithDetails } = await import('../dist/esm/components/Common/LogoWithDetails.js')
const { copied } = await import(clipboard)

for (const onlyFullVersion of [false, true]) {
  test(`logo menu copies standalone SVGs without a server renderer (full: ${onlyFullVersion})`, async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    copied.length = 0
    try {
      await act(async () => root.render(createElement(StrictMode, null,
        createElement(LogoWithDetails, { onlyFullVersion, className: 'host-logo-style' }))))
      const buttons = [...container.querySelectorAll('button')]
      assert.deepEqual(buttons.map(button => button.textContent), ['Copy logo as SVG', 'Copy symbol as SVG'])
      await act(async () => {
        for (const button of buttons) {
          assert.equal(button.disabled, false)
          button.click()
        }
      })
      assert.equal(copied.length, 2)
      for (const [index, markup] of copied.entries()) {
        const svgDocument = new dom.window.DOMParser().parseFromString(markup, 'image/svg+xml')
        assert.equal(svgDocument.querySelector('parsererror'), null)
        const svg = svgDocument.documentElement
        assert.equal(svg.localName, 'svg')
        assert.equal(svg.namespaceURI, 'http://www.w3.org/2000/svg')
        assert.equal(svg.getAttribute('viewBox'), index === 0 ? '0 0 319 81' : '0 0 77 77')
        assert.equal(svg.getAttribute('width'), index === 0 ? '319' : '77')
        assert.equal(svg.getAttribute('height'), index === 0 ? '81' : '77')
        assert.ok(svg.querySelector('path[fill="#FF3272"]'))
        assert.equal(svg.querySelectorAll('path').length, index === 0 ? 12 : 3)
        assert.doesNotMatch(markup, /class=|hidden|host-logo-style/)
      }
    } finally {
      await act(async () => root.unmount())
      container.remove()
    }
  })
}
