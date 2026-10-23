import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimeout as wait } from 'node:timers/promises'
import { Script } from 'node:vm'
import { createRpcTestProxy } from './rpc-test-proxy.mjs'

const transaction = { jsonrpc: '2.0', id: 7, method: 'eth_sendRawTransaction', params: ['0xsigned-test-payload'] }
const read = { jsonrpc: '2.0', id: 8, method: 'eth_chainId', params: [] }

async function setup(t, reply) {
  const forwarded = []
  const server = createRpcTestProxy({
    upstream: 'https://rpc.example/secret-api-key',
    fetchRpc: async (url, options) => {
      const request = JSON.parse(options.body)
      forwarded.push({ url: String(url), request })
      return { ok: true, json: async () => reply?.(request) ?? { jsonrpc: '2.0', id: request.id, result: '0x1234' } }
    },
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const post = async (path, body, headers = {}) => {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
    return { status: response.status, body: await response.json() }
  }
  const arm = options => post('/control', { mode: 'timeout-before', scope: 'broadcast', once: true, delayMs: 100, durationMs: 60_000, ...options })
  const status = async () => (await fetch(base + '/status')).json()
  t.after(async () => {
    await post('/control', { mode: 'pass' })
    await new Promise(resolve => server.close(resolve))
  })
  return { forwarded, post, arm, status, base }
}

test('default pass-through preserves requests and responses', async t => {
  const proxy = await setup(t)
  assert.deepEqual((await proxy.post('/rpc', transaction)).body, { jsonrpc: '2.0', id: 7, result: '0x1234' })
  assert.deepEqual(proxy.forwarded, [{ url: 'https://rpc.example/secret-api-key', request: transaction }])
})

test('blocking a broadcast does not forward it, affect reads, or fault the next broadcast', async t => {
  const proxy = await setup(t)
  await proxy.arm()
  assert.equal((await proxy.post('/rpc', read)).body.result, '0x1234')
  assert.match((await proxy.post('/rpc', transaction)).body.error.message, /timed out/)
  assert.deepEqual(proxy.forwarded.map(call => call.request.method), ['eth_chainId'])
  assert.equal((await proxy.post('/rpc', transaction)).body.result, '0x1234')
})

test('post-broadcast timeout forwards exactly once, then hides the accepted response', async t => {
  const proxy = await setup(t)
  await proxy.arm({ mode: 'timeout-after' })
  assert.match((await proxy.post('/rpc', transaction)).body.error.message, /timed out/)
  assert.equal(proxy.forwarded.length, 1)
  assert.deepEqual(proxy.forwarded[0].request, transaction)
  const status = await proxy.status()
  assert.match(status.history[0].action, /upstream accepted/)
  assert.ok(!JSON.stringify(status).includes('signed-test-payload'))
  assert.ok(!JSON.stringify(status).includes('secret-api-key'))
})

test('post-broadcast mode preserves genuine upstream errors', async t => {
  const rejection = { jsonrpc: '2.0', id: 7, error: { code: -32000, message: 'Insufficient funds' } }
  const proxy = await setup(t, () => rejection)
  await proxy.arm({ mode: 'timeout-after' })
  assert.deepEqual((await proxy.post('/rpc', transaction)).body, rejection)
})

test('held responses can be released immediately without forwarding again', async t => {
  const proxy = await setup(t)
  await proxy.arm({ mode: 'delay', delayMs: 60_000 })
  let settled = false
  const pending = proxy.post('/rpc', transaction).then(value => { settled = true; return value })
  const deadline = Date.now() + 2000
  while ((await proxy.status()).waiting !== 1 && Date.now() < deadline) await wait(5)
  assert.equal((await proxy.status()).waiting, 1)
  assert.equal(settled, false)
  assert.equal(proxy.forwarded.length, 1, 'broadcast happens before the delayed response')
  await proxy.post('/control', { mode: 'pass' })
  assert.equal((await pending).body.result, '0x1234')
  assert.equal(proxy.forwarded.length, 1)
  assert.equal((await proxy.status()).waiting, 0)
})

test('timed faults affect matching requests only until expiry', async t => {
  const proxy = await setup(t)
  await proxy.arm({ once: false, durationMs: 200 })
  for (let i = 0; i < 2; i++) assert.ok((await proxy.post('/rpc', transaction)).body.error)
  assert.equal(proxy.forwarded.length, 0)
  await wait(220)
  assert.equal((await proxy.post('/rpc', transaction)).body.result, '0x1234')
})

test('all-method scope can reproduce a preparation failure; batches retain IDs', async t => {
  const proxy = await setup(t)
  await proxy.arm({ scope: 'all' })
  const response = (await proxy.post('/rpc', [read, transaction])).body
  assert.equal(response[0].id, 8)
  assert.match(response[0].error.message, /timed out/)
  assert.deepEqual(response[1], { jsonrpc: '2.0', id: 7, result: '0x1234' })
  assert.deepEqual(proxy.forwarded.map(call => call.request.method), ['eth_sendRawTransaction'])
})

test('remote origins and invalid settings cannot arm faults', async t => {
  const proxy = await setup(t)
  assert.equal((await proxy.post('/control', { mode: 'pass' }, { Origin: 'https://remote.example' })).status, 403)
  assert.equal((await proxy.arm({ delayMs: -1 })).status, 400)
  assert.equal((await proxy.arm({ mode: 'invalid' })).status, 400)
  assert.equal((await proxy.status()).fault.mode, 'pass')
})

test('disarming while the upstream is in flight prevents a later response hold', async t => {
  const upstream = Promise.withResolvers()
  const proxy = await setup(t, () => upstream.promise)
  await proxy.arm({ mode: 'delay', delayMs: 60_000 })
  const pending = proxy.post('/rpc', transaction)
  const deadline = Date.now() + 2000
  while (!proxy.forwarded.length && Date.now() < deadline) await wait(5)
  assert.equal(proxy.forwarded.length, 1)
  await proxy.post('/control', { mode: 'pass' })
  upstream.resolve({ jsonrpc: '2.0', id: 7, result: 'accepted' })
  const response = await Promise.race([pending, wait(500).then(() => 'still held')])
  assert.notEqual(response, 'still held')
  assert.equal(response.body.result, 'accepted')
  assert.equal((await proxy.status()).waiting, 0)
})

test('the browser control page is served and its inline script parses', async t => {
  const proxy = await setup(t)
  const page = await (await fetch(proxy.base)).text()
  assert.match(page, /Broadcasts only/)
  assert.match(page, /release delayed responses/)
  assert.doesNotThrow(() => new Script(page.match(/<script>([\s\S]*?)<\/script>/)[1]))
})
