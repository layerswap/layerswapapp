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
