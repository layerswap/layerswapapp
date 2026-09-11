import assert from 'node:assert/strict'
import test from 'node:test'
import { widgetErrorImpact } from '../faro-error-policy.ts'
import { getErrorOccurrenceId } from '../../../../packages/widget/types/src/errorOccurrence.ts'
import { resolveFaroRelease } from '../faro-release.cjs'

test('balance, gas and interceptor diagnostics are not user operation failures', () => {
    for (const type of ['BalanceResolverError', 'BalanceProviderError', 'GasProviderError', 'FeesPerGasError', 'APIError', 'SwapCatchupError', 'GasMiscalculation']) {
        assert.equal(widgetErrorImpact({ type, message: 'request failed' }), 'diagnostic')
    }
    for (const type of ['SwapWithdrawalError', 'TransactionFailed', 'ErrorFallback', 'SwapFailed']) {
        assert.equal(widgetErrorImpact({ type, message: 'failed' }), 'user')
    }
    assert.equal(widgetErrorImpact({ type: 'SwapWithdrawalError', name: 'TransactionRejected', message: 'declined' }), 'expected')
    assert.equal(widgetErrorImpact({ type: 'APIError', message: 'User denied the request' }), 'expected')
})

test('same failure links interceptor, lifecycle and wrapped handler; separate failures never merge by text', () => {
    const failure = new Error('provider failure')
    const interceptor = { type: 'APIError', cause: failure }
    const wrapper = { type: 'SwapWithdrawalError', cause: failure }
    const id = getErrorOccurrenceId(interceptor)
    assert.equal(getErrorOccurrenceId(failure), id)
    assert.equal(getErrorOccurrenceId(wrapper), id)
    assert.equal(getErrorOccurrenceId(Object.freeze({ cause: wrapper })), id)
    assert.notEqual(getErrorOccurrenceId(new Error('provider failure')), id)
    assert.equal(getErrorOccurrenceId('provider failure'), undefined)
    const cycle = {}; cycle.cause = cycle
    assert.equal(getErrorOccurrenceId(cycle), getErrorOccurrenceId(cycle))
})

test('release uses CI identity for both SDK and uploader, never labels an unidentified production build local', () => {
    assert.equal(resolveFaroRelease({ VERCEL_GIT_COMMIT_SHA: 'vercel-sha' }, true), 'vercel-sha')
    assert.equal(resolveFaroRelease({ GITHUB_SHA: 'github-sha' }, true), 'github-sha')
    assert.equal(resolveFaroRelease({ NEXT_PUBLIC_FARO_RELEASE: 'release-1', GITHUB_SHA: 'sha' }, true), 'release-1')
    assert.equal(resolveFaroRelease({}, true), 'unknown-release')
    assert.equal(resolveFaroRelease({}, false), 'local')
})
