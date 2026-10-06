import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.endsWith('/AppSettings')) return {
            url: 'data:text/javascript,export default { LayerswapApiUri: "https://api.test", LayerswapApiKeys: { mainnet: "test" }, ApiVersion: "mainnet" }', shortCircuit: true,
        }
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) return nextResolve(`${specifier}.js`, context)
        return nextResolve(specifier, context)
    },
})
after(() => hooks.deregister())
const { default: Client } = await import('../dist/esm/lib/apiClients/layerSwapApiClient.js')
const { resolveAtomicDepositActions } = await import('../dist/esm/lib/atomicBatchActions.js')
const { validateAtomicBatch } = await import('../dist/esm/helpers/atomicBatch.js')
const { getActionableDepositAction, resolveDepositAddress } = await import('../dist/esm/helpers/depositActions.js')
const fixture = JSON.parse(readFileSync(new URL('./fixtures/atomic-batch.json', import.meta.url)))
const clone = value => structuredClone(value)

function clientFor(actions, next = fixture.next_actions.sufficient_allowance) {
    const client = new Client(), requests = []
    client._authInterceptor.defaults.adapter = async config => {
        const url = new URL(config.url)
        requests.push({ path: url.pathname, query: url.searchParams, method: config.method, body: config.data && JSON.parse(config.data) })
        const isNext = url.pathname.endsWith('/next_action')
        if (isNext && next instanceof Error) throw next
        const data = isNext ? next : url.pathname.endsWith('/deposit_actions') ? actions
            : { swap: { ...fixture.swap, id: 'atomic-swap', source_address: fixture.account }, deposit_actions: actions }
        return { status: 200, statusText: 'OK', headers: {}, config, data: { data: clone(data) } }
    }
    return { client, requests }
}

for (const name of ['zero_allowance', 'allowance_reset']) test(`${name}: flat backend actions become one complete atomic action`, async () => {
    const { client, requests } = clientFor(fixture.deposit_actions[name])
    const response = await client.GetDepositActionsAsync('atomic-swap', fixture.account)
    assert.equal(requests.length, 1, 'the complete flat response needs no second allowance read')
    assert.equal(response.data.length, 1)
    const action = getActionableDepositAction(response.data)
    assert.equal(action.type, 'send_calls')
    assert.deepEqual(action.calls, fixture.next_actions[name].action.calls)
    assert.equal(action.valid_before, 2000000000)
    assert.equal(action.from_address, undefined, 'backend does not provide a sender in these items')
    assert.deepEqual(validateAtomicBatch(action, fixture.swap, fixture.account, fixture.account).map(call => call.value), action.calls.map(() => 0n))
    assert.equal(response.data.some(action => action.type === 'sign'), false)
})

for (const route of ['create', 'swap', 'actions']) test(`${route}: sufficient allowance stays atomic, including reload without a local creation flag`, async () => {
    const { client, requests } = clientFor(fixture.deposit_actions.sufficient_allowance)
    const response = route === 'create' ? await client.CreateSwapAsync({ source_address: fixture.account, use_atomic_batch: true })
        : route === 'swap' ? await client.GetSwapAsync('atomic-swap', fixture.account)
        : await client.GetDepositActionsAsync('atomic-swap', fixture.account)
    const actions = route === 'actions' ? response.data : response.data.deposit_actions
    assert.equal(requests.length, 2)
    assert.equal(requests[1].path, '/api/v2/swaps/atomic-swap/next_action')
    assert.equal(requests[1].query.get('source_address'), fixture.account)
    if (route === 'create') assert.equal(requests[0].body.use_atomic_batch, true)
    assert.equal(actions[0].type, 'send_calls')
    assert.equal(actions[0].calls.length, 1)
    assert.equal(actions[0].valid_before, undefined, 'expiry comes from the next_action envelope')
    assert.equal(validateAtomicBatch(actions[0], fixture.swap, fixture.account, fixture.account)[0].value, 0n)
})

test('an allowance change between reads uses every call in the authoritative next_action', async () => {
    const { client } = clientFor(fixture.deposit_actions.sufficient_allowance, fixture.next_actions.allowance_reset)
    const response = await client.GetDepositActionsAsync('atomic-swap', fixture.account)
    assert.deepEqual(response.data[0].calls, fixture.next_actions.allowance_reset.action.calls)
})

test('both decimal deposit_actions and hex next_action values retain precision above the safe integer range', async () => {
    const precise = fixture.deposit_actions.precise_value
    const actions = clone(fixture.deposit_actions.zero_allowance)
    actions[1].amount_in_base_units = precise[0].amount_in_base_units
    const flat = await resolveAtomicDepositActions(actions, () => assert.fail('flat calls are already complete'))
    const single = await resolveAtomicDepositActions(precise, async () => fixture.next_actions.precise_value)
    for (const plan of [flat, single]) assert.equal(validateAtomicBatch(plan[0], fixture.swap, fixture.account, fixture.account).at(-1).value, 900719925474099312345678901n)
})

test('legacy signed publication remains an ordinary transfer', async () => {
    const actions = fixture.deposit_actions.sufficient_allowance
    const { client } = clientFor(actions, { step: 'publish', status: 'action_required', action: actions[0] })
    assert.deepEqual((await client.GetDepositActionsAsync('legacy-swap', fixture.account)).data, actions)
})

test('native, gasless, Permit2 approval and manual-deposit responses keep their existing workflow', async () => {
    const publish = fixture.deposit_actions.sufficient_allowance[0]
    for (const actions of [
        [{ ...publish, token: { ...fixture.token, contract: null } }],
        [{ type: 'sign', step: 'sign', status: 'action_required' }],
        [{ ...publish, step: 'approve_permit2' }],
        [{ ...publish, type: 'manual_transfer', step: 'deposit' }],
        [{ type: 'sign', step: 'sign', status: 'completed' }, publish],
    ]) {
        const { client, requests } = clientFor(actions, new Error('next_action must not be requested'))
        assert.deepEqual((await client.GetDepositActionsAsync('legacy-swap')).data, actions)
        assert.equal(requests.length, 1)
    }
})

test('standalone atomic approvals cannot be selected or executed as ordinary transfers', () => {
    assert.equal(getActionableDepositAction(fixture.deposit_actions.zero_allowance), undefined)
    assert.equal(resolveDepositAddress(fixture.network, fixture.deposit_actions.zero_allowance), fixture.split_intake)
})

test('pending and completed placeholders retain backend progress without becoming executable', async () => {
    for (const status of ['pending', 'completed', 'failed']) {
        const actions = [{ step: 'approve', status: 'completed' }, { step: 'publish', status }]
        assert.deepEqual(await resolveAtomicDepositActions(actions, () => assert.fail('no executable calls')), actions)
        assert.equal(getActionableDepositAction(actions), undefined)
    }
})

test('mixed, reordered, inconsistent and incomplete atomic workflows fail before any wallet action', async () => {
    const valid = fixture.deposit_actions.zero_allowance
    for (const actions of [
        [...valid, { type: 'sign', step: 'sign', status: 'action_required' }],
        [valid[1], valid[0]],
        [valid[0]],
        [valid[0], { ...valid[1], order: 3 }],
        [valid[0], { ...valid[1], status: 'waiting' }],
        [{ ...valid[0], network: { ...fixture.network, chain_id: '1' } }, valid[1]],
        [{ ...valid[0], valid_before: 2000000001 }, valid[1]],
        [{ ...valid[0], amount_in_base_units: 9007199254740993 }, valid[1]],
        [{ ...valid[0], amount_in_base_units: '1.1' }, valid[1]],
    ]) await assert.rejects(resolveAtomicDepositActions(actions, () => assert.fail('cannot use a sequential fallback')))
})

test('an unavailable or malformed next_action cannot silently select an ordinary transfer', async () => {
    for (const next of [new Error('status outage'), { step: 'publish', status: 'pending' },
        { step: 'publish', status: 'action_required', action: { type: 'sign' } },
    ]) {
        const { client } = clientFor(fixture.deposit_actions.sufficient_allowance, next)
        await assert.rejects(client.GetDepositActionsAsync('atomic-swap', fixture.account), /outage|changed|Invalid/)
    }
    const { client } = clientFor(fixture.deposit_actions.sufficient_allowance,
        { step: 'publish', status: 'action_required', expires_at: fixture.next_actions.sufficient_allowance.expires_at, action: { type: 'send_calls', calls: [] } })
    const response = await client.GetDepositActionsAsync('atomic-swap', fixture.account)
    assert.equal(response.data[0].type, 'send_calls')
    assert.throws(() => validateAtomicBatch(response.data[0], fixture.swap, fixture.account, fixture.account), /no calls/)
})
