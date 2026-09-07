import assert from 'node:assert/strict'
import test from 'node:test'
import { createLogStore } from '../dist/esm/stores/logStore.js'

const event = {
  type: 'WalletError',
  message: 'Test error',
}

function captureConsole(run) {
  const originalError = console.error
  const originalLog = console.log
  const errors = []
  const logs = []

  console.error = (...args) => errors.push(args)
  console.log = (...args) => logs.push(args)

  try {
    run({ errors, logs })
  } finally {
    console.error = originalError
    console.log = originalLog
  }
}

test('a throwing error logger falls back without invoking itself again', () => {
  const store = createLogStore()
  let handlerCalls = 0
  const unregister = store.getState().registerLogger(() => {
    handlerCalls++
    throw new Error('Host logger failed')
  })

  try {
    captureConsole(({ errors, logs }) => {
      assert.doesNotThrow(() => store.getState().logger(event))
      assert.equal(handlerCalls, 1)
      assert.equal(errors.length, 1)
      assert.equal(logs.length, 1)
      assert.deepEqual(logs[0], ['[layerswap:log]', event])
    })
  } finally {
    unregister()
  }
})

test('a re-entrant error logger is blocked after one invocation', () => {
  const store = createLogStore()
  let handlerCalls = 0
  const unregister = store.getState().registerLogger((nestedEvent) => {
    handlerCalls++
    store.getState().logger(nestedEvent)
  })

  try {
    captureConsole(({ errors, logs }) => {
      assert.doesNotThrow(() => store.getState().logger(event))
      assert.equal(handlerCalls, 1)
      assert.equal(errors.length, 1)
      assert.match(String(errors[0][1]), /Recursive onError callback invocation blocked/)
      assert.equal(logs.length, 1)
    })
  } finally {
    unregister()
  }
})

test('registration cleanup cannot remove a newer logger and restores the previous owner', () => {
  const store = createLogStore()
  let firstHandlerCalls = 0
  let secondHandlerCalls = 0

  const unregisterFirst = store.getState().registerLogger(() => {
    firstHandlerCalls++
  })
  const unregisterSecond = store.getState().registerLogger(() => {
    secondHandlerCalls++
  })

  store.getState().logger(event)
  assert.equal(firstHandlerCalls, 0)
  assert.equal(secondHandlerCalls, 1)

  unregisterSecond()
  unregisterSecond()
  store.getState().logger(event)
  assert.equal(firstHandlerCalls, 1)
  assert.equal(secondHandlerCalls, 1)

  unregisterFirst()
  captureConsole(({ logs }) => {
    store.getState().logger(event)
    assert.equal(logs.length, 1)
    assert.deepEqual(logs[0], ['[layerswap:log]', event])
  })
})

test('cleanup from an older registration leaves the active logger untouched', () => {
  const store = createLogStore()
  let secondHandlerCalls = 0

  const unregisterFirst = store.getState().registerLogger(() => {
    throw new Error('Older logger should not be restored')
  })
  const unregisterSecond = store.getState().registerLogger(() => {
    secondHandlerCalls++
  })

  unregisterFirst()
  store.getState().logger(event)
  assert.equal(secondHandlerCalls, 1)

  unregisterSecond()
})
