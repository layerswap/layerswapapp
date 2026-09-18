import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldShowCompactSwapQuote } from '../dist/esm/helpers/swapFlow.js'
import { isGaslessDepositWorkflow } from '../dist/esm/helpers/gasless.js'

const sameNetworkSwap = {
    use_deposit_address: false,
    source_network: { name: 'BASE_MAINNET' },
    destination_network: { name: 'BASE_MAINNET' },
}

test('same-network wallet swaps show compact details when the user pays gas', () => {
    assert.equal(shouldShowCompactSwapQuote({
        swapData: sameNetworkSwap,
        isGaslessActive: false,
    }), true)
})

test('bridges, manual deposits, and gasless deposits retain their existing layout', () => {
    for (const options of [
        { swapData: { ...sameNetworkSwap, destination_network: { name: 'ARBITRUM_MAINNET' } } },
        { swapData: { ...sameNetworkSwap, use_deposit_address: true } },
        { swapData: sameNetworkSwap, isGaslessActive: true },
        { swapData: undefined },
        { swapData: { ...sameNetworkSwap, source_network: undefined, destination_network: undefined } },
    ]) {
        assert.equal(shouldShowCompactSwapQuote({ isGaslessActive: false, ...options }), false)
    }
})

test('gasless mode stays unknown until deposit actions are available', () => {
    assert.equal(isGaslessDepositWorkflow(undefined), undefined)
    assert.equal(isGaslessDepositWorkflow([]), undefined)
})

test('authorization-only deposits are gasless, including pending and legacy actions', () => {
    for (const actions of [
        [{ type: 'sign', step: 'sign', status: 'action_required' }],
        [{ step: 'sign', status: 'pending' }],
        [{ type: 'sign' }],
    ]) {
        assert.equal(isGaslessDepositWorkflow(actions), true)
    }
})

test('frontend signing followed by publishing is self-paid throughout the workflow', () => {
    for (const status of ['waiting', 'action_required', 'pending', 'completed']) {
        assert.equal(isGaslessDepositWorkflow([
            { step: 'approve_permit2', status: 'completed' },
            { type: 'sign', step: 'sign', status: 'completed' },
            { step: 'publish', status },
        ]), false)
    }
})

test('ordinary wallet transfers are self-paid', () => {
    assert.equal(isGaslessDepositWorkflow([{ type: 'transfer', step: 'deposit' }]), false)
    assert.equal(isGaslessDepositWorkflow([{ type: 'manual_transfer' }]), false)
})
