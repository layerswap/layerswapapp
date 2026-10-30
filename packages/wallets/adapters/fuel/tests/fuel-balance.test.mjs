import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
            try { return nextResolve(`${specifier}.js`, context) }
            catch (error) {
                if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
                return nextResolve(`${specifier}/index.js`, context)
            }
        }
        return nextResolve(specifier, context)
    },
})
after(() => hooks.deregister())

const { FuelBalanceProvider } = await import('../dist/esm/fuelBalanceProvider.js')
const asset = `0x${'ab'.repeat(32)}`
const token = { symbol: 'ETH', contract: asset, decimals: 9 }
const network = { name: 'FUEL_MAINNET', node_url: 'https://mock.fuel.example', token, tokens: [token] }

function balancePage(nodes = [], hasNextPage = false, endCursor = null) {
    return { data: { balances: { nodes, pageInfo: { hasNextPage, endCursor } } } }
}

function mockPages(t, pages) {
    const requests = []
    t.mock.method(globalThis, 'fetch', async (url, init) => {
        assert.equal(url, network.node_url)
        requests.push(JSON.parse(init.body))
        assert.ok(pages.length, 'no unexpected extra balance requests')
        const page = pages.shift()
        if (page instanceof Error) throw page
        return page instanceof Response ? page : Response.json(page)
    })
    return requests
}

const fetchBalance = () => new FuelBalanceProvider().fetchBalance('owner', network, { retryCount: 1 })

test('an empty successful response reports zero ETH so an unfunded account can be blocked', async t => {
    mockPages(t, [balancePage()])
    const [balance] = await fetchBalance()
    assert.equal(balance.amount, 0)
    assert.equal(balance.isNativeCurrency, true)
    assert.equal(balance.network, network.name)
    assert.equal(balance.token, 'ETH')
    assert.ok(Number.isFinite(Date.parse(balance.request_time)))
})

test('all balance pages are read before deciding an asset is absent', async t => {
    const otherAssets = Array.from({ length: 5 }, (_, index) => ({ assetId: `other-${index}`, amount: '1' }))
    const requests = mockPages(t, [
        balancePage(otherAssets, true, 'next-page'),
        balancePage([{ assetId: asset.toUpperCase(), amount: '4000016' }]),
    ])
    const [balance] = await fetchBalance()
    assert.equal(balance.amount, 0.004000016)
    assert.deepEqual(requests.map(request => request.variables), [
        { filter: { owner: 'owner' }, after: null },
        { filter: { owner: 'owner' }, after: 'next-page' },
    ])
})

test('zero is returned for an absent asset only after the last page', async t => {
    const requests = mockPages(t, [balancePage([], true, 'next-page'), balancePage()])
    assert.equal((await fetchBalance())[0].amount, 0)
    assert.equal(requests.length, 2)
})

for (const [name, failure] of [
    ['HTTP rejection', () => new Response('Unavailable', { status: 503 })],
    ['GraphQL error with partial data', () => ({ ...balancePage(), errors: [{ message: 'Index unavailable' }] })],
    ['network failure', () => new Error('Failed to fetch')],
    ['missing data', () => ({ data: null })],
    ['missing pagination state', () => ({ data: { balances: { nodes: [] } } })],
    ['invalid amount', () => balancePage([{ assetId: asset, amount: 'not-a-number' }])],
    ['imprecise numeric amount', () => balancePage([{ assetId: asset, amount: 9007199254740993 }])],
]) {
    test(`${name} remains an error instead of a zero balance`, async t => {
        mockPages(t, [failure()])
        await assert.rejects(fetchBalance())
    })
}

test('failure on a later page does not publish partial balances', async t => {
    mockPages(t, [balancePage([{ assetId: asset, amount: '1000000' }], true, 'next-page'), { errors: [{ message: 'Query failed' }] }])
    await assert.rejects(fetchBalance(), /Query failed/)
})

test('a repeated cursor fails instead of looping or reporting missing assets as zero', async t => {
    const requests = mockPages(t, [balancePage([], true, 'same'), balancePage([], true, 'same')])
    await assert.rejects(fetchBalance(), /pagination cursor/)
    assert.equal(requests.length, 2)
})

test('a token without an asset ID stays unknown rather than being reported as unfunded', async t => {
    mockPages(t, [balancePage()])
    const balances = await new FuelBalanceProvider().fetchBalance('owner', {
        ...network, tokens: [{ ...token, contract: null }],
    }, { retryCount: 1 })
    assert.equal(balances[0].amount, undefined)
})
