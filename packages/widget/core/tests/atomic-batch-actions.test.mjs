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

function clientFor(actions) {
    const client = new Client(), requests = []
    client._authInterceptor.defaults.adapter = async config => {
        const url = new URL(config.url)
        requests.push({ path: url.pathname, query: url.searchParams, method: config.method, body: config.data && JSON.parse(config.data) })
        assert.ok(!url.pathname.endsWith('/next_action'), 'the removed endpoint must never be requested')
        const data = url.pathname.endsWith('/deposit_actions') ? actions
            : { swap: { ...fixture.swap, id: 'atomic-swap', source_address: fixture.account }, deposit_actions: actions }
        return { status: 200, statusText: 'OK', headers: {}, config, data: { data: clone(data) } }
    }
    return { client, requests }
}

for (const endpoint of ['/swaps/atomic-swap', '/swaps/atomic-swap/deposit_actions', '/internal/apps']) {
    test(`generic authenticated fetcher returns ${endpoint} unchanged without action lookups`, async () => {
        const actions = fixture.deposit_actions.sufficient_allowance
        const { client, requests } = clientFor(actions)
        const response = await client.fetcher(endpoint)
        const returnedActions = endpoint.endsWith('/deposit_actions') ? response.data : response.data.deposit_actions
        assert.deepEqual(returnedActions, actions)
        assert.equal(requests.length, 1, 'transport performs only the requested HTTP call')
    })
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

for (const route of ['create', 'swap', 'actions']) test(`${route}: sufficient allowance uses one regular transaction, including after reload`, async () => {
    const { client, requests } = clientFor(fixture.deposit_actions.sufficient_allowance)
    const response = route === 'create' ? await client.CreateSwapAsync({ source_address: fixture.account, use_atomic_batch: true })
        : route === 'swap' ? await client.GetSwapAsync('atomic-swap', fixture.account)
        : await client.GetDepositActionsAsync('atomic-swap', fixture.account)
    const actions = route === 'actions' ? response.data : response.data.deposit_actions
    assert.equal(requests.length, 1, 'the response already contains the complete action plan')
    if (route !== 'create') assert.equal(requests[0].query.get('source_address'), fixture.account)
    if (route === 'create') assert.equal(requests[0].body.use_atomic_batch, true)
    assert.equal(actions[0].type, 'transfer')
    assert.equal(actions[0].calls, undefined)
    assert.equal(actions[0].to_address, fixture.split_intake)
    assert.equal(actions[0].call_data, fixture.next_actions.sufficient_allowance.action.calls[0].data)
    assert.equal(actions[0].amount, 0)
    assert.equal(actions[0].amount_in_base_units, '0')
    assert.equal(actions[0].valid_before, 2000000000)
})

test('an explicit refresh uses the latest complete deposit_actions plan', async () => {
    const actions = clone(fixture.deposit_actions.sufficient_allowance)
    const { client, requests } = clientFor(actions)
    assert.equal((await client.GetDepositActionsAsync('atomic-swap')).data[0].type, 'transfer')
    actions.splice(0, actions.length, ...fixture.deposit_actions.allowance_reset)
    const refreshed = await client.GetDepositActionsAsync('atomic-swap')
    assert.deepEqual(refreshed.data[0].calls, fixture.next_actions.allowance_reset.action.calls)
    assert.equal(requests.length, 2, 'one HTTP request per explicit refresh')
})

test('normalization retains decimal and hex values above the safe integer range (not a submission guarantee)', async () => {
    const precise = fixture.deposit_actions.precise_value
    const actions = clone(fixture.deposit_actions.zero_allowance)
    actions[1].amount_in_base_units = precise[0].amount_in_base_units
    const flat = await resolveAtomicDepositActions(actions)
    const single = await resolveAtomicDepositActions([{ ...precise[0], ...fixture.next_actions.precise_value.action }])
    assert.equal(validateAtomicBatch(flat[0], fixture.swap, fixture.account, fixture.account).at(-1).value, 900719925474099312345678901n)
    assert.equal(single[0].type, 'transfer')
    assert.equal(single[0].amount_in_base_units, '900719925474099312345678901')
})

test('legacy signed publication remains an ordinary transfer', async () => {
    const actions = fixture.deposit_actions.sufficient_allowance
    const { client } = clientFor(actions)
    assert.deepEqual((await client.GetDepositActionsAsync('legacy-swap', fixture.account)).data, [{ ...actions[0], amount: 0 }])
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
        const { client, requests } = clientFor(actions)
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
        assert.deepEqual(await resolveAtomicDepositActions(actions), actions)
        assert.equal(getActionableDepositAction(actions), undefined)
    }
})

test('mixed, reordered, inconsistent and incomplete atomic workflows fail before any wallet action', async () => {
    const valid = fixture.deposit_actions.zero_allowance
    for (const actions of [
        [...valid, { type: 'sign', step: 'sign', status: 'action_required' }],
        [valid[1], valid[0]],
        [valid[0], { ...valid[1], order: 3 }],
        // Sequential reset approvals must become actionable one at a time.
        [...fixture.deposit_actions.allowance_reset.slice(0, 2), { step: 'publish', status: 'pending' }],
        [{ ...valid[0], network: { ...fixture.network, chain_id: '1' } }, valid[1]],
        [{ ...valid[0], valid_before: 2000000001 }, valid[1]],
        [{ ...valid[0], amount_in_base_units: 9007199254740993 }, valid[1]],
        [{ ...valid[0], amount_in_base_units: '1.1' }, valid[1]],
    ]) assert.throws(() => resolveAtomicDepositActions(actions))
})

test('an empty batch remains non-executable', async () => {
    const { client } = clientFor([{ ...fixture.deposit_actions.sufficient_allowance[0], type: 'send_calls', calls: [] }])
    const response = await client.GetDepositActionsAsync('atomic-swap', fixture.account)
    assert.equal(response.data[0].type, 'send_calls')
    assert.throws(() => validateAtomicBatch(response.data[0], fixture.swap, fixture.account, fixture.account), /no calls/)
})

for (const route of ['create', 'swap']) test(`${route} preserves the swap identity when its action plan is malformed`, async () => {
    const malformed = [{ ...fixture.deposit_actions.sufficient_allowance[0], amount_in_base_units: undefined }]
    const { client, requests } = clientFor(malformed)
    const response = route === 'create'
        ? await client.CreateSwapAsync({ source_address: fixture.account, use_atomic_batch: true })
        : await client.GetSwapAsync('atomic-swap', fixture.account)
    assert.equal(response.data.swap.id, 'atomic-swap')
    assert.equal(response.data.swap.source_address, fixture.account)
    assert.equal(response.data.deposit_actions, undefined, 'malformed actions cannot open the wallet')
    assert.equal(requests.length, 1)
    await assert.rejects(client.GetDepositActionsAsync('atomic-swap', fixture.account), /missing its transaction value/)
})

for (const shape of ['transfer', 'send_calls', 'completed-approval']) {
    test(`${shape} single publication becomes a regular transfer with exact calldata and native value`, async () => {
        const next = clone(fixture.next_actions.precise_value)
        const original = fixture.deposit_actions.precise_value[0]
        const input = shape === 'send_calls'
            ? [{ ...next.action, step: 'publish', status: 'action_required', network: original.network,
                token: original.token, valid_before: original.valid_before }]
            : shape === 'completed-approval'
                ? [{ step: 'approve', status: 'completed' }, original] : [original]
        const result = resolveAtomicDepositActions(input)
        assert.equal(result.length, shape === 'completed-approval' ? 2 : 1)
        if (shape === 'completed-approval') assert.deepEqual(result[0], input[0])
        const action = getActionableDepositAction(result)
        assert.equal(action.type, 'transfer')
        assert.equal(action.amount_in_base_units, '900719925474099312345678901')
        assert.equal(action.call_data, next.action.calls[0].data)
        assert.equal(action.to_address, next.action.calls[0].to)
        assert.equal(action.calls, undefined)
    })
}

for (const shape of ['transfer', 'send_calls', 'completed-approval', 'completed-signature', 'atomic-plan']) {
    for (const callData of [null, undefined, '', '0x', '0x123', '0xnothex']) {
        test(`${shape} rejects invalid publication calldata ${JSON.stringify(callData)} before execution`, () => {
            const publish = { ...fixture.deposit_actions.sufficient_allowance[0], call_data: callData }
            const actions = shape === 'send_calls'
                ? [{ ...publish, type: 'send_calls', calls: [{ to: publish.to_address, data: callData, value: '0x0' }] }]
                : shape === 'completed-approval' ? [{ step: 'approve', status: 'completed' }, publish]
                : shape === 'completed-signature' ? [{ step: 'sign', status: 'completed' }, publish]
                : shape === 'atomic-plan' ? [fixture.deposit_actions.zero_allowance[0], publish]
                : [publish]
            assert.throws(() => resolveAtomicDepositActions(actions), /Invalid .*publication|Invalid publication/)
        })
    }
}

for (const route of ['create', 'swap', 'actions']) {
    test(`${route} refuses a publication with missing calldata while preserving an existing swap`, async () => {
        const { client, requests } = clientFor([{ ...fixture.deposit_actions.sufficient_allowance[0], call_data: null }])
        if (route === 'actions') {
            await assert.rejects(client.GetDepositActionsAsync('atomic-swap'), /Invalid publication/)
        } else {
            const response = route === 'create'
                ? await client.CreateSwapAsync({ source_address: fixture.account })
                : await client.GetSwapAsync('atomic-swap')
            assert.equal(response.data.swap.id, 'atomic-swap')
            assert.equal(response.data.deposit_actions, undefined)
        }
        assert.equal(requests.length, 1)
    })
}

for (const change of [
    { to: '0x123' }, { to: `0x${'0'.repeat(40)}` }, { data: '0x123' }, { data: null },
    { value: '-1' }, { value: '0x' }, { value: `0x${(2n ** 256n).toString(16)}` },
]) {
    test(`malformed single publication stays non-executable: ${JSON.stringify(change)}`, async () => {
        const next = clone(fixture.next_actions.sufficient_allowance)
        Object.assign(next.action.calls[0], change)
        assert.throws(() => resolveAtomicDepositActions([{ ...fixture.deposit_actions.sufficient_allowance[0], ...next.action }]), /Invalid single-call/)
    })
}

test('the current deposit response preserves exact calldata, value and expiry', () => {
    const publish = { ...fixture.deposit_actions.sufficient_allowance[0],
        expires_at: '2033-05-18T03:33:19Z', call_data: '0xabcd', amount_in_base_units: '123456789012345678901' }
    const resolved = resolveAtomicDepositActions([publish])
    assert.deepEqual(resolved, [{ ...publish, amount: 0 }])
})

test('a publication without either transaction value cannot become executable', () => {
    const publish = { ...fixture.deposit_actions.sufficient_allowance[0] }
    delete publish.amount_in_base_units
    assert.throws(() => resolveAtomicDepositActions([publish]), /missing its transaction value/)
})
