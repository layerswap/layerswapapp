import assert from 'node:assert/strict'
import test, { after, afterEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { AxiosError } from 'axios'
import { setErrorLogger } from '@layerswap/widget-types'

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    // The real settings graph is browser-oriented; the client only needs a base URL and key.
    if (specifier.endsWith('/AppSettings')) {
      return { url: 'data:text/javascript,export default { LayerswapApiUri: "https://api.test", LayerswapApiKeys: { mainnet: "secret-api-key" }, ApiVersion: "mainnet" }', shortCircuit: true }
    }
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
      return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
  },
})
after(() => hooks.deregister())

const { default: LayerSwapApiClient } = await import('../dist/esm/lib/apiClients/layerSwapApiClient.js')
const { createSwapAttempt } = await import('../dist/esm/lib/swapCreation.js')
const { registerWidgetErrorLogger } = await import('../dist/esm/lib/ErrorHandler.js')

afterEach(() => registerWidgetErrorLogger())

const SOURCE_ADDRESS = '0x1111111111111111111111111111111111111111'
const DESTINATION_ADDRESS = '0x2222222222222222222222222222222222222222'

/** A client whose transport fails the way axios does: the error carries config, request and response. */
function failingClient() {
  const client = new LayerSwapApiClient()
  client._authInterceptor.defaults.adapter = async config => {
    const request = { url: config.url, headers: config.headers, xhr: 'XMLHttpRequest' }
    throw new AxiosError('Request failed with status code 500', 'ERR_BAD_RESPONSE', config, request, {
      status: 500, statusText: 'Internal Server Error', headers: {}, config,
      data: { error: { code: 'SERVER_ERROR', message: 'boom' } },
    })
  }
  return client
}

test('an API failure reaches onError without the axios config, headers, request or body', async () => {
  const reported = []
  setErrorLogger(event => reported.push(event))
  const params = { source_address: SOURCE_ADDRESS, destination_address: DESTINATION_ADDRESS, source_network: 'A', destination_network: 'B' }
  await assert.rejects(failingClient().CreateSwapAsync(params), error => error instanceof AxiosError)

  assert.equal(reported.length, 1)
  const [event] = reported
  assert.equal(event.type, 'APIError')
  assert.equal(event.status, 500)
  assert.deepEqual(event.cause, { status: 500, code: 'ERR_BAD_RESPONSE', method: 'post', url: 'https://api.test/api/v2/swaps' })
  for (const field of ['config', 'headers', 'request', 'data', 'response']) {
    assert.equal(Object.hasOwn(event.cause, field), false, `cause must not carry ${field}`)
  }
  const serialized = JSON.stringify(event)
  assert.doesNotMatch(serialized, /secret-api-key|X-LS-APIKEY/i)
  assert.doesNotMatch(serialized, new RegExp(`${SOURCE_ADDRESS}|${DESTINATION_ADDRESS}`))
})

test('the reported url drops the query string', async () => {
  const reported = []
  setErrorLogger(event => reported.push(event))
  await assert.rejects(failingClient().GetDepositActionsAsync('swap-1', SOURCE_ADDRESS))
  assert.equal(reported[0].cause.url, 'https://api.test/api/v2/swaps/swap-1/deposit_actions')
  assert.equal(reported[0].cause.method, 'get')
})

test('the onError occurrence id matches the swap_creation_failed lifecycle event for the same failure', async () => {
  const reported = []
  const lifecycle = []
  setErrorLogger(event => reported.push(event))
  const client = failingClient()
  await assert.rejects(createSwapAttempt(
    async () => ({ request: () => client.CreateSwapAsync({ source_address: SOURCE_ADDRESS }), useGasless: false, onCreated: [] }),
    { path: 'test.createSwap', lifecycleContext: {}, onLifecycle: event => lifecycle.push(event), onGaslessUnavailable: () => {} },
  ))
  const failed = lifecycle.find(event => event.step === 'swap_creation_failed')
  assert.ok(failed?.occurrenceId)
  assert.equal(reported.length, 1)
  assert.equal(reported[0].occurrenceId, failed.occurrenceId)
})
