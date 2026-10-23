import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

const broadcastMethods = new Set(['eth_sendRawTransaction', 'eth_sendTransaction'])
const modes = new Set(['pass', 'delay', 'timeout-before', 'timeout-after'])

/** A local testing tool. Only an explicitly armed fault changes RPC responses. */
export function createRpcTestProxy({ upstream, fetchRpc = fetch }) {
  const target = new URL(upstream)
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('RPC_UPSTREAM must be an HTTP(S) URL')
  let fault = { mode: 'pass' }
  let resetVersion = 0
  const history = []
  const delays = new Set()
  const log = (method, action) => {
    history.unshift({ time: new Date().toISOString(), method, action })
    history.length = Math.min(history.length, 30)
  }
  const resume = () => { for (const release of delays) release() }
  const wait = ms => new Promise(resolve => {
    const release = () => { clearTimeout(timer); delays.delete(release); resolve() }
    const timer = setTimeout(release, ms)
    delays.add(release)
  })
  const timeout = id => ({ jsonrpc: '2.0', id, error: { code: -32000, message: 'RPC request timed out (local test proxy)' } })

  async function rpc(request) {
    if (!request || typeof request.method !== 'string') throw new Error('Expected a JSON-RPC request')
    const active = fault.mode !== 'pass' && Date.now() < fault.until
      && (fault.scope === 'all' || broadcastMethods.has(request.method))
    const selected = active ? { ...fault, resetVersion } : { mode: 'pass' }
    if (active && fault.once) fault = { mode: 'pass' }
    log(request.method, selected.mode)
    if (selected.mode === 'timeout-before') return timeout(request.id)

    let result
    try {
      const response = await fetchRpc(target, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request), signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      result = await response.json()
    } catch {
      log(request.method, 'upstream request failed')
      return { jsonrpc: '2.0', id: request.id, error: { code: -32000, message: 'Upstream RPC request failed' } }
    }
    // Disarming also cancels a selected fault whose upstream request was in flight.
    if (selected.mode !== 'pass' && selected.resetVersion !== resetVersion) return result
    // Preserve a genuine upstream rejection; it does not establish a broadcast.
    if (!result.error && selected.mode === 'timeout-after') {
      log(request.method, 'upstream accepted; returning simulated timeout')
      return timeout(request.id)
    }
    if (selected.mode === 'delay') {
      log(request.method, `upstream replied; holding response for ${selected.delayMs / 1000}s`)
      await wait(selected.delayMs)
    }
    return result
  }

  const server = createServer(async (req, res) => {
    const path = req.url?.split('?')[0]
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host ?? '')) {
      res.writeHead(403); res.end('Local host only'); return
    }
    if (path === '/rpc') {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Private-Network', 'true')
    }
    const json = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(value))
    }
    try {
      if (req.method === 'OPTIONS' && path === '/rpc') { res.writeHead(204); res.end(); return }
      if (req.method === 'GET' && path === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(controlPage); return
      }
      if (req.method === 'GET' && path === '/status') {
        json(200, { upstream: target.hostname, fault: Date.now() < fault.until ? fault : { mode: 'pass' }, waiting: delays.size, history }); return
      }
      if (req.method !== 'POST' || !['/rpc', '/control'].includes(path)) { json(404, { error: 'Not found' }); return }
      // Remote sites must not be able to arm faults in the user's wallet RPC.
      if (path === '/control' && ((req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)
        || !req.headers['content-type']?.startsWith('application/json'))) {
        json(403, { error: 'Use the local control page or application/json from curl' }); return
      }
      const chunks = []
      let bytes = 0
      for await (const chunk of req) {
        bytes += chunk.length
        if (bytes > 2_000_000) throw new Error('Request too large')
        chunks.push(chunk)
      }
      const body = JSON.parse(Buffer.concat(chunks).toString())
      if (path === '/control') {
        if (!modes.has(body.mode)) throw new Error('Invalid mode')
        if (body.mode === 'pass') { fault = { mode: 'pass' }; resetVersion++; resume() }
        else {
          if (!['broadcast', 'all'].includes(body.scope)) throw new Error('Invalid scope')
          if (![body.delayMs, body.durationMs].every(v => Number.isFinite(v) && v >= 0 && v <= 600_000)) throw new Error('Durations must be between 0 and 600000 milliseconds')
          fault = { mode: body.mode, scope: body.scope, once: body.once !== false,
            delayMs: body.delayMs, until: Date.now() + body.durationMs }
        }
        json(200, { ok: true }); return
      }
      json(200, Array.isArray(body) ? await Promise.all(body.map(rpc)) : await rpc(body))
    } catch (error) { json(400, { error: error.message }) }
  })
  server.on('close', resume)
  return server
}

const controlPage = `<!doctype html><meta charset="utf-8"><title>Layerswap RPC test proxy</title>
<style>body{font:16px system-ui;max-width:760px;margin:40px auto;padding:0 20px;color:#18222f}label{display:block;margin:16px 0}select,input,button{font:inherit;padding:8px}button{cursor:pointer;margin-right:8px}pre{background:#f0f3f6;padding:16px;white-space:pre-wrap}small{display:block;margin-top:8px}</style>
<h1>RPC test proxy</h1><p>Wallet RPC URL: <strong id="rpc"></strong></p>
<p>Use a test wallet and testnet. “Timeout after forwarding” and “Delay response” can send a real transaction even though the wallet sees an error or keeps waiting.</p>
<label>Fault <select id="mode"><option value="timeout-before">Timeout before forwarding (no broadcast)</option><option value="timeout-after">Forward, then return timeout (transaction may be sent)</option><option value="delay">Forward, then delay response</option></select></label>
<label>Apply to <select id="scope"><option value="broadcast">Broadcasts only</option><option value="all">All RPC methods (also affects preparation)</option></select></label>
<label>Response delay (seconds) <input id="delay" type="number" value="90" min="0" max="600"></label>
<label>Armed window (seconds) <input id="duration" type="number" value="120" min="1" max="600"></label>
<label><input id="once" type="checkbox" checked> Only the next matching request; otherwise every matching request during the window</label>
<button id="arm">Arm fault</button><button id="resume">Pass through / release delayed responses</button>
<p id="message" role="status"></p><pre id="state"></pre>
<small>The log records method names and outcomes, never signed transaction payloads or upstream credentials. A simulated timeout is not a guaranteed wallet transport timeout; wallets may retry or recover a transaction hash internally.</small>
<script>
const el=id=>document.getElementById(id);el('rpc').textContent=location.origin+'/rpc';
async function refresh(){try{el('state').textContent=JSON.stringify(await(await fetch('/status')).json(),null,2)}catch{el('message').textContent='Proxy is not responding'}}
async function control(body){try{const response=await fetch('/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();el('message').textContent=response.ok?'Updated':result.error;await refresh()}catch{el('message').textContent='Proxy is not responding'}}
el('arm').onclick=()=>control({mode:el('mode').value,scope:el('scope').value,once:el('once').checked,delayMs:Number(el('delay').value)*1000,durationMs:Number(el('duration').value)*1000});
el('resume').onclick=()=>control({mode:'pass'});refresh();setInterval(refresh,1000);
</script>`

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.RPC_UPSTREAM) { console.error('Usage: RPC_UPSTREAM=https://your-chain-rpc node scripts/rpc-test-proxy.mjs'); process.exitCode = 1 }
  else {
    const port = Number(process.env.RPC_PROXY_PORT ?? 8547)
    const server = createRpcTestProxy({ upstream: process.env.RPC_UPSTREAM })
    server.on('error', error => { console.error(error.message); process.exitCode = 1 })
    server.listen(port, '127.0.0.1', () => {
      console.log(`Controls: http://127.0.0.1:${port}/\nWallet RPC: http://127.0.0.1:${port}/rpc\nDefault: pass through. Ctrl+C to stop.`)
    })
  }
}
