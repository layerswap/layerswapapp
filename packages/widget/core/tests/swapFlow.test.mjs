import assert from 'node:assert/strict'
import test from 'node:test'
import { isGaslessDepositWorkflow } from '../dist/esm/helpers/gasless.js'

test('gasless mode stays unknown until deposit actions are available', () => {
    assert.equal(isGaslessDepositWorkflow(undefined), undefined)
    assert.equal(isGaslessDepositWorkflow([]), undefined)
})

test('sign-only snapshots leave the execution lane unknown, including legacy actions', () => {
    for (const actions of [
        [{ type: 'sign', step: 'sign', status: 'action_required' }],
        [{ step: 'sign', status: 'pending' }],
        [{ type: 'sign' }],
    ]) {
        assert.equal(isGaslessDepositWorkflow(actions), undefined)
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

test('explicit signing standards distinguish gasless Permit2 from self-paid authorization', () => {
    assert.equal(isGaslessDepositWorkflow([{ step: 'sign', signing_standard: 'permit2' }]), true)
    assert.equal(isGaslessDepositWorkflow([{ step: 'sign', signing_standard: 'eip3009' }]), undefined)
    for (const signing_standard of ['permit2_witness', 'eip2612']) {
        assert.equal(isGaslessDepositWorkflow([{ step: 'sign', signing_standard }]), false)
    }
})
