import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { getWalletSessionAttributes, MAX_WALLET_CONTEXT_BYTES } from '../faro-wallet-context.ts'
import { createWalletContextWriter, updateSessionContext, observeWalletContext } from '../faro-session-context.ts'
import { beforeSend } from '../faro-sanitizer.ts'

// All addresses and provider objects here are synthetic unit-test inputs.
const wallet = (address = 'test-account-a', extras = {}) => ({
    id: 'MetaMask', internalId: 'io.metamask', address, addresses: [address],
    providerName: 'EVM', isActive: true, ...extras,
})
const provider = (wallets = [wallet()], extras = {}) => ({ id: 'evm', ready: true, connectedWallets: wallets, ...extras })
const entries = attrs => JSON.parse(attrs.connected_wallets)

test('complete captured wallet body preserves observed schema and exact paired Loki relationships', () => {
    const fixture = JSON.parse(readFileSync(new URL('../../grafana/fixtures/faro-wallet-browser-payload.json', import.meta.url)))
    const { body, loki } = fixture
    assert.equal(fixture.provenance.verification, 'Verified in outgoing Faro payload')
    assert.equal(loki.verification, 'Verified in Loki')
    assert.equal(body.logs.length, 1)
    assert.equal(body.traces, undefined)
    assert.equal(loki.match.matchingRecords, 1)
    assert.equal(body.meta.session.id, loki.parsedFields.session_id)
    assert.equal(body.meta.session.attributes.connected_wallets, loki.parsedFields.session_attr_connected_wallets)
    assert.equal(body.meta.session.attributes.journey_id, loki.parsedFields.session_attr_journey_id)
    assert.equal(body.logs[0].level, loki.parsedFields.level)
    assert.equal(body.logs[0].timestamp.replace('T', ' ').replace('Z', ' +0000 UTC'), loki.parsedFields.timestamp)
    assert.equal(entries(body.meta.session.attributes).length, Number(body.meta.session.attributes.connected_wallet_count))
    assert.equal(body.meta.session.attributes.swap_id, '')
    assert.equal(loki.observedDifferences[0].storedPresent, false)
    const item = { type: 'log', payload: body.logs[0], meta: body.meta }
    assert.deepEqual(beforeSend(item), item)
})
function sessionAPI(attributes = {}) {
    let session = { id: 'synthetic-session', attributes, overrides: { serviceName: 'test-service' } }
    let writes = 0
    return {
        getSession: () => session,
        setSession: next => { session = next; writes++ },
        writes: () => writes,
    }
}

test('wallet projection retains addresses without inferring an EVM network or serializing provider data', () => {
    const attrs = getWalletSessionAttributes([provider([wallet('test-account-a', {
        metadata: { privateKey: 'synthetic-never-export' }, icon: 'https://private.invalid/',
        addresses: ['test-account-a', 'other-authorized-not-selected'],
    })])])
    assert.deepEqual(entries(attrs), [{ wallet_address: 'test-account-a', wallet_family: 'evm', wallet_connector: 'io.metamask' }])
    assert.equal(attrs.connected_wallet_count, '1')
    assert.equal(attrs.connected_wallets_state, 'ready')
    assert(!JSON.stringify(attrs).includes('synthetic-never-export'))
    assert(!JSON.stringify(attrs).includes('wallet_network'))
})

test('multiple connections, account/chain changes, missing chains and disconnects replace the snapshot', () => {
    const api = sessionAPI({ swap_id: 'test-swap', requested_amount: 'test-amount' })
    const publish = snapshots => updateSessionContext(api, 'wallet', getWalletSessionAttributes(snapshots))
    publish([provider([wallet()]), provider([wallet('test-solana', { internalId: 'phantom', chainId: 'solana:test' })], { id: 'solana' })])
    assert.equal(api.getSession().attributes.connected_wallet_count, '2')
    publish([provider([wallet('test-account-b', { chainId: 11155111 })])])
    assert.deepEqual(entries(api.getSession().attributes), [{ wallet_address: 'test-account-b', wallet_family: 'evm', wallet_connector: 'io.metamask', wallet_chain_id: '11155111' }])
    publish([provider([wallet('test-account-b')])])
    assert(!('wallet_chain_id' in entries(api.getSession().attributes)[0]))
    publish([provider([])])
    assert.equal(api.getSession().attributes.connected_wallets, '[]')
    assert.equal(api.getSession().attributes.connected_wallet_count, '0')
    assert.equal(api.getSession().attributes.swap_id, 'test-swap')
    assert.equal(api.getSession().attributes.requested_amount, 'test-amount')
    assert.equal(api.getSession().id, 'synthetic-session')
})

test('stable order and duplicate records do not cause repeated session writes', () => {
    const a = provider([wallet()])
    const b = provider([wallet('test-b')], { id: 'starknet' })
    const api = sessionAPI()
    updateSessionContext(api, 'wallet', getWalletSessionAttributes([a, b]))
    updateSessionContext(api, 'wallet', getWalletSessionAttributes([b, a, a]))
    assert.equal(api.writes(), 1)
    assert.equal(api.getSession().attributes.connected_wallet_count, '2')
})

test('swap replacement clears stale swap keys but retains wallet and SDK/unrelated metadata', () => {
    const walletAttrs = getWalletSessionAttributes([provider()])
    const api = sessionAPI({ ...walletAttrs, isSampled: 'false', previousSession: 'previous-test',
        reason: 'old-reason', transaction_hash: 'old-test-hash', journey_id: 'old-journey', custom_host: 'keep' })
    const initial = structuredClone(api.getSession())
    updateSessionContext(api, 'swap', { step: 'swap_created', journey_id: 'new-test-journey', connected_wallets: 'bad', isSampled: 'true' })
    const result = api.getSession()
    assert.equal(result.id, initial.id)
    assert.deepEqual(result.overrides, initial.overrides)
    assert.equal(result.attributes.reason, undefined)
    assert.equal(result.attributes.transaction_hash, undefined)
    assert.equal(result.attributes.journey_id, 'new-test-journey')
    assert.equal(result.attributes.connected_wallets, walletAttrs.connected_wallets)
    assert.equal(result.attributes.isSampled, 'false')
    assert.equal(result.attributes.previousSession, 'previous-test')
    assert.equal(result.attributes.custom_host, 'keep')
    updateSessionContext(api, 'swap', { status: 'pending' }, false)
    assert.equal(api.getSession().attributes.journey_id, 'new-test-journey')
    updateSessionContext(api, 'wallet', { ...walletAttrs, swap_id: 'bad' })
    assert.equal(api.getSession().attributes.swap_id, undefined)
})

test('restore states discard persisted wallet claims until current connections become available', () => {
    const api = sessionAPI({ connected_wallets: 'stale-wallet-data', swap_id: 'test-swap' })
    const pending = provider(undefined, { isStub: true, ready: false, pendingSessionRestore: true })
    updateSessionContext(api, 'wallet', getWalletSessionAttributes([pending]))
    assert.equal(api.getSession().attributes.connected_wallets, '[]')
    assert.equal(api.getSession().attributes.connected_wallets_state, 'restoring')
    assert.equal(getWalletSessionAttributes([provider([], { isStub: true, ready: false })]).connected_wallets_state, 'ready')
    updateSessionContext(api, 'wallet', getWalletSessionAttributes([provider()]))
    assert.equal(api.getSession().attributes.connected_wallet_count, '1')
    assert.equal(api.getSession().attributes.swap_id, 'test-swap')
    assert.equal(updateSessionContext({ getSession: () => undefined }, 'wallet', {}), false)
})

test('payload bounds omit whole records without truncating addresses or making invalid JSON', () => {
    const attrs = getWalletSessionAttributes([provider(Array.from({ length: 100 }, (_, i) => wallet('test-address-' + i)))])
    assert(new TextEncoder().encode(attrs.connected_wallets).length <= MAX_WALLET_CONTEXT_BYTES)
    assert.equal(Number(attrs.connected_wallet_count) + Number(attrs.connected_wallets_omitted), 100)
    assert(Number(attrs.connected_wallets_omitted) > 0)
    for (const entry of entries(attrs)) assert.match(entry.wallet_address, /^test-address-\d+$/)
    const sanitized = beforeSend({ type: 'event', payload: { name: 'unit-test' }, meta: { session: { id: 'test', attributes: attrs } } })
    assert.deepEqual(JSON.parse(sanitized.meta.session.attributes.connected_wallets), entries(attrs))
    const invalid = getWalletSessionAttributes([provider([wallet('x'.repeat(257)), wallet('', {}), wallet('valid', { chainId: NaN })], { id: 'unrecognized-provider' })])
    assert.equal(invalid.connected_wallets_omitted, '2')
    assert.equal(entries(invalid)[0].wallet_family, 'unknown')
    assert(!('wallet_chain_id' in entries(invalid)[0]))
})

test('observer publishes restored/live state, unsubscribes and clears without touching wallet APIs', () => {
    let snapshots = [provider()]
    const listeners = new Set()
    const registry = {
        getEntries: () => snapshots.map(snapshot => ({ store: { getState: () => snapshot } })),
        subscribe: cb => { listeners.add(cb); return () => listeners.delete(cb) },
    }
    const api = sessionAPI({ swap_id: 'keep' })
    const start = () => observeWalletContext(registry,
        values => updateSessionContext(api, 'wallet', getWalletSessionAttributes(values)),
        () => updateSessionContext(api, 'wallet', getWalletSessionAttributes([])))
    let stop = start()
    assert.equal(api.getSession().attributes.connected_wallet_count, '1')
    snapshots = [provider([wallet('changed')])]
    listeners.forEach(cb => cb())
    assert.equal(entries(api.getSession().attributes)[0].wallet_address, 'changed')
    stop()
    assert.equal(listeners.size, 0)
    assert.equal(api.getSession().attributes.connected_wallet_count, '0')
    // React StrictMode's cleanup/remount must restore the current snapshot.
    stop = start()
    assert.equal(api.getSession().attributes.connected_wallet_count, '1')
    assert.equal(api.getSession().attributes.swap_id, 'keep')
    stop()
    const stopFailure = observeWalletContext(registry, () => { throw Error('synthetic') }, () => { throw Error('synthetic') })
    assert.doesNotThrow(() => listeners.forEach(cb => cb()))
    assert.doesNotThrow(stopFailure)
})

test('wallet writer restores current-tab context after session rotation/adoption without recursive writes', () => {
    const listeners = new Set()
    const api = sessionAPI()
    const set = api.setSession
    api.setSession = next => { set(next); listeners.forEach(cb => cb()) }
    const write = createWalletContextWriter(api, cb => listeners.add(cb))
    const attrs = getWalletSessionAttributes([provider()])
    assert.equal(write(attrs), true)
    assert.equal(api.writes(), 1)
    api.setSession({ id: 'rotated-session', attributes: { connected_wallets: 'stale-other-tab', isSampled: 'false' } })
    assert.equal(api.writes(), 3)
    assert.equal(api.getSession().id, 'rotated-session')
    assert.equal(api.getSession().attributes.isSampled, 'false')
    assert.equal(api.getSession().attributes.connected_wallets, attrs.connected_wallets)
    write(getWalletSessionAttributes([]))
    api.setSession({ id: 'another-session', attributes: { connected_wallets: 'old-connected-data' } })
    assert.equal(api.getSession().attributes.connected_wallets, '[]')
    assert.equal(api.getSession().attributes.connected_wallets_state, 'unavailable')
})

test('stored wallet fixture retains valid JSON, optional chain and session equality without identifying addresses', () => {
    const fixture = JSON.parse(readFileSync(new URL('../../grafana/fixtures/faro-wallet-loki-observed.json', import.meta.url)))
    assert.equal(fixture.verification, 'Verified in Loki')
    assert.equal(fixture.provenance.completeWindow, false)
    assert.deepEqual(fixture.rawQueryEvidence.streamLabelNames, ['detected_level', 'service_name', 'source'])
    const disconnected = JSON.parse(readFileSync(new URL('../../grafana/fixtures/faro-wallet-disconnect-loki-observed.json', import.meta.url)))
    assert.equal(disconnected.verification, 'Verified in Loki')
    assert.equal(disconnected.latestIsEmpty, true)
    assert.equal(disconnected.checks.sameSession, true)
    assert.equal(disconnected.checks.sameJourney, true)
    assert.equal(disconnected.after.parsedFields.session_id, fixture.records[0].parsedFields.session_id)
    assert(BigInt(disconnected.after.timestampNs) > BigInt(fixture.records[0].timestampNs))
    assert.deepEqual(JSON.parse(disconnected.after.parsedFields.session_attr_connected_wallets), [])
    assert.equal(disconnected.after.parsedFields.session_attr_connected_wallet_count, '0')
    assert.equal(disconnected.after.parsedFields.session_attr_connected_wallets_state, 'ready')
    const reconnected = JSON.parse(readFileSync(new URL('../../grafana/fixtures/faro-wallet-reconnect-loki-observed.json', import.meta.url)))
    const currentWallets = JSON.parse(reconnected.record.parsedFields.session_attr_connected_wallets)
    assert.equal(currentWallets[0].wallet_address, 'address-wallet-test-2')
    assert.equal(reconnected.record.parsedFields.session_id, disconnected.after.parsedFields.session_id)
    assert(BigInt(reconnected.record.timestampNs) > BigInt(disconnected.after.timestampNs))
    for (const check of ['addressChanged', 'oldAddressAbsentFromCurrentWallets', 'sameSession', 'oldAddressStillSearchable', 'newAddressSearchable']) {
        assert.equal(reconnected.checks[check], true)
    }
    assert.equal(reconnected.checks.sameJourney, false, 'do not assume a preserved journey from a shared session')
    for (const record of fixture.records) {
        const fields = record.parsedFields
        const wallets = JSON.parse(fields.session_attr_connected_wallets)
        assert.equal(wallets.length, Number(fields.session_attr_connected_wallet_count))
        assert.equal(wallets[0].wallet_address, 'address-wallet-test-1')
        assert.equal(wallets[0].wallet_chain_id, '43114')
        assert.equal(fields.session_id, 'session-wallet-test-1')
        assert.equal(fields.session_attr_step, 'flow_error')
    }
})
