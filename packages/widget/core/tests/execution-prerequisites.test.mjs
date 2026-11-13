import assert from 'node:assert/strict'
import test from 'node:test'
import { SwapPrerequisiteError } from '../../../wallets/core/dist/esm/lib/swapPrerequisites.js'
import { loadSource } from './helpers/source.mjs'

function executionHooks(check) {
    const snapshot = { destination: { network: { name: 'STELLAR_MAINNET' }, token: { symbol: 'USDC' }, address: 'recipient' } }
    const checkedIds = []
    const react = { useCallback: callback => callback }
    const { useBeforeSwapExecution } = loadSource('hooks/useBeforeSwapExecution.ts', {
        react,
        '@layerswap/wallet-core': { SwapPrerequisiteError },
        '../context/swap': { useSwapDataUpdate: () => ({ getExecutionPrerequisites: id => {
            checkedIds.push(id)
            return snapshot
        } }) },
        './useSwapPrerequisites': { useCheckSwapPrerequisites: () => context => check(context) },
    })
    const submissions = []
    const { useAtomicBatch } = loadSource('hooks/useAtomicBatch.ts', {
        react, './useBeforeSwapExecution': { useBeforeSwapExecution },
        '@/lib/atomicBatchExecution': { executeAtomicBatch: async (...args) => { submissions.push(args) } },
    })
    const { useTransfer } = loadSource('hooks/useTransfer.ts', {
        react, './useBeforeSwapExecution': { useBeforeSwapExecution },
        '@/lib/resolvers/resolverService': { resolverService: { getTransferResolver: () => ({
            executeTransfer: async (...args) => { submissions.push(args); return 'transaction-hash' },
        }) } },
    })
    return { snapshot, checkedIds, submissions, batch: useAtomicBatch(), transfer: useTransfer().executeTransfer }
}

test('atomic submission cannot reach a wallet when destination setup fails', async () => {
    const failure = new SwapPrerequisiteError([], 'Add a trustline')
    const hooks = executionHooks(async () => { throw failure })
    await assert.rejects(hooks.batch({ swapData: { id: 'created-swap' } }, {}, {}), error => error === failure)
    assert.deepEqual(hooks.checkedIds, ['created-swap'])
    assert.deepEqual(hooks.submissions, [])
})

test('atomic submission waits for a fresh readiness check and preserves its request', async () => {
    const readiness = Promise.withResolvers()
    const hooks = executionHooks(context => {
        assert.equal(context, hooks.snapshot)
        return readiness.promise
    })
    const request = [{ swapData: { id: 'created-swap' } }, { calls: [] }, {}]
    const submitting = hooks.batch(...request)
    assert.deepEqual(hooks.submissions, [])
    readiness.resolve()
    await submitting
    assert.deepEqual(hooks.submissions, [request])
})

test('closing the atomic flow during readiness checking cancels submission', async () => {
    const controller = new AbortController()
    const hooks = executionHooks(async () => { controller.abort() })
    await assert.rejects(hooks.batch({ swapData: { id: 'swap' }, signal: controller.signal }, {}, {}), { name: 'AbortError' })
    assert.deepEqual(hooks.submissions, [])
})

test('blocked provider transfers clear their submission reservation and remain retryable', async () => {
    const states = []
    const hooks = executionHooks(async () => { throw new Error('Account check unavailable') })
    await assert.rejects(hooks.transfer({ swapId: 'swap', onSubmissionStateChange: state => states.push(state) }), SwapPrerequisiteError)
    assert.deepEqual(states, ['not_submitted'])
    assert.deepEqual(hooks.submissions, [])
})

test('ready provider transfers retain normal submission reporting', async () => {
    const states = []
    const hooks = executionHooks(async () => {})
    const request = { swapId: 'swap', onSubmissionStateChange: state => states.push(state) }
    assert.equal(await hooks.transfer(request), 'transaction-hash')
    assert.equal(hooks.submissions[0][0], request)
    assert.deepEqual(states, [])
})

test('a failed action-time check rejects without awaiting rechecks of other mounted consumers', async () => {
    const { prerequisitesReady, swapPrerequisiteKey } = await import('../../../wallets/core/dist/esm/lib/swapPrerequisites.js')
    const failed = [{ provider: {}, result: { status: 'unavailable', title: 'Couldn’t check account setup' } }]
    const resolver = { supports: () => true, check: async () => failed }
    const published = []
    let revalidationFilter
    const { useCheckSwapPrerequisites } = loadSource('hooks/useSwapPrerequisites.ts', {
        react: { useCallback: callback => callback, useEffect: effect => { effect() }, useRef: current => ({ current }), useMemo: factory => factory(), useState: () => [] },
        swr: { default: () => ({}), useSWRConfig: () => ({ mutate: (key, data) => {
            if (typeof key === 'function') {
                revalidationFilter = key
                return new Promise(() => {})
            }
            published.push([key, data])
            return Promise.resolve()
        } }) },
        '@layerswap/wallet-core': { prerequisitesReady, SwapPrerequisiteError, swapPrerequisiteKey },
        '../context/swapPrerequisites': { useSwapPrerequisiteResolver: () => resolver },
    })
    const context = { destination: { network: { name: 'STELLAR_MAINNET' }, token: { symbol: 'USDC' }, address: 'recipient' }, receiveAmount: '11' }
    const other = { ...context, receiveAmount: '9' }
    await assert.rejects(useCheckSwapPrerequisites()(context), SwapPrerequisiteError)
    assert.deepEqual(published, [[['swap-prerequisites', resolver, swapPrerequisiteKey(context)], failed]])
    assert.equal(revalidationFilter(['swap-prerequisites', resolver, swapPrerequisiteKey(context)]), false)
    assert.equal(revalidationFilter(['swap-prerequisites', resolver, swapPrerequisiteKey(other)]), true)
    assert.equal(revalidationFilter(['swap-prerequisites', {}, swapPrerequisiteKey(other)]), false)
})
