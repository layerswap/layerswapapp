import assert from 'node:assert/strict'
import test from 'node:test'
import { SwapPrerequisiteResolver, prerequisitesReady, firstBlockingPrerequisite, swapPrerequisiteKey } from '../dist/esm/lib/swapPrerequisites.js'
import { LazySwapPrerequisiteProvider } from '@layerswap/widget-types'

const context = {
    destination: { network: { name: 'CUSTOM', chain_id: '1', node_url: 'https://rpc.example' }, token: { symbol: 'TOKEN', contract: 'issuer', decimals: 7 }, address: 'recipient' },
    receiveAmount: '9',
}

test('a non-Stellar provider can gate and resolve the normal flow without network dispatch', async () => {
    let enabled = false
    const provider = {
        id: 'custom-account',
        supports: c => c.destination.network.name === 'CUSTOM',
        check: async () => enabled ? { status: 'ready' } : {
            status: 'required', title: 'Enable account', description: 'Approve setup.',
            action: { id: 'enable', label: 'Enable', wallet: { network: context.destination.network, address: 'recipient' } },
        },
        execute: async () => { enabled = true },
    }
    const resolver = new SwapPrerequisiteResolver([provider])
    const blocked = await resolver.check(context)
    assert.equal(prerequisitesReady(blocked), false)
    assert.equal(firstBlockingPrerequisite(blocked).description, 'Approve setup.')
    await blocked[0].provider.execute(context, blocked[0].result.action.id, {})
    assert.equal(prerequisitesReady(await resolver.check(context)), true)
})

test('legacy providers without prerequisites continue unchanged', async () => {
    const resolver = new SwapPrerequisiteResolver([])
    assert.equal(resolver.supports(context), false)
    assert.equal(prerequisitesReady(await resolver.check(context)), true)
})

test('unavailable verification blocks instead of marking an account unactivated', async () => {
    const resolver = new SwapPrerequisiteResolver([{ id: 'offline', supports: () => true, check: async () => { throw new Error('offline') } }])
    const entries = await resolver.check(context)
    assert.equal(entries[0].result.status, 'unavailable')
    assert.equal(prerequisitesReady(entries), false)
})

test('all applicable prerequisites must finish, including external steps', async () => {
    for (const status of ['required', 'blocked', 'unavailable']) {
        const resolver = new SwapPrerequisiteResolver([
            { id: 'ready', supports: () => true, check: async () => ({ status: 'ready' }) },
            { id: 'other', supports: () => true, check: async () => ({ status }) },
        ])
        assert.equal(prerequisitesReady(await resolver.check(context)), false)
    }
})

test('lazy preflight loads once and retries failed imports', async () => {
    let attempts = 0
    const lazy = new LazySwapPrerequisiteProvider('custom', () => true, async () => {
        if (++attempts === 1) throw new Error('chunk unavailable')
        return { id: 'custom', supports: () => true, check: async () => ({ status: 'ready' }) }
    })
    await assert.rejects(lazy.check(context))
    await Promise.all([lazy.check(context), lazy.check(context)])
    assert.equal(attempts, 2)
})

test('readiness keys distinguish network, issuer, recipient, amount and endpoint changes', () => {
    const key = swapPrerequisiteKey(context)
    const mutations = [
        c => { c.destination.address = 'other' },
        c => { c.destination.token.contract = 'other' },
        c => { c.destination.network.chain_id = '2' },
        c => { c.destination.network.node_url = 'https://other.example' },
        c => { c.receiveAmount = '20' },
    ]
    for (const mutate of mutations) {
        const updated = structuredClone(context)
        mutate(updated)
        assert.notEqual(swapPrerequisiteKey(updated), key)
    }
})
