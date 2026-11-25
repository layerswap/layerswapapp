import assert from 'node:assert/strict'
import test, { beforeEach, afterEach, after } from 'node:test'
import React, { act, createElement } from 'react'
import { JSDOM } from 'jsdom'
import { loadSource } from './helpers/source.mjs'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const { createRoot } = await import('react-dom/client')

const context = loadSource('components/NavigatableList/context.ts', { react: { ...React, default: React } })
const keyboard = loadSource('hooks/useKeyboardNavigation.ts', { react: React })
const { useNavigatableList } = loadSource('hooks/useNavigatableList.ts', {
  react: React,
  '@/hooks/useKeyboardNavigation': keyboard,
  '@/components/NavigatableList/context': context,
})

let root, container, entered
const items = [{ childCount: 0 }, { childCount: 0 }]

function Probe({ isPending }) {
  useNavigatableList({ navigableItems: items, isPending, onEnter: index => entered.push(index) })
  return null
}

const render = isPending => act(() => root.render(createElement(Probe, { isPending })))
const pressEnter = () => {
  const event = new window.KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
  act(() => { window.dispatchEvent(event) })
  return event
}

beforeEach(() => {
  entered = []
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => {
  await act(() => root.unmount())
  container.remove()
})
after(() => {
  dom.window.close()
  for (const key of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
    else delete globalThis[key]
  }
})

test('Enter activates the focused item when results are current', async () => {
  await render(false)
  const event = pressEnter()
  assert.deepEqual(entered, ['0'])
  assert.equal(event.defaultPrevented, true)
})

test('Enter is consumed without activating a stale item while results are pending', async () => {
  await render(true)
  const event = pressEnter()
  assert.deepEqual(entered, [])
  assert.equal(event.defaultPrevented, true)

  await render(false)
  pressEnter()
  assert.deepEqual(entered, ['0'])
})
