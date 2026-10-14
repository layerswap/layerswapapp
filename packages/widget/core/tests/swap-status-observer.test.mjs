import assert from 'node:assert/strict'
import test from 'node:test'
import { createSwapStatusObserver, SWAP_STATUS_CONTEXT_FIELDS } from '../dist/esm/lib/swapStatusObserver.js'

test('all initial statuses establish a baseline, including statuses not notified to hosts', () => {
  for (const initial of ['created', 'user_transfer_pending', 'ls_transfer_pending', 'pending_refund', 'completed', 'failed', 'expired', 'refunded']) {
    const observer = createSwapStatusObserver()
    assert.equal(observer.observe({ swapId: 's', type: initial }), false)
    assert.equal(observer.observe({ swapId: 's', type: initial }), false)
    for (const type of ['ls_transfer_pending', 'completed', 'failed', 'expired']) {
      const fresh = createSwapStatusObserver()
      fresh.observe({ swapId: 's', type: initial })
      assert.equal(fresh.observe({ swapId: 's', type }), initial !== type, `${initial} -> ${type}`)
    }
  }
})

test('explicit creation, true transitions and context enrichment have separate semantics', () => {
  const observer = createSwapStatusObserver()
  observer.created('new')
  const event = { swapId: 'new', type: 'ls_transfer_pending' }
  assert.equal(observer.observe(event), true)
  observer.created('new') // replaying creation cannot reset the baseline
  for (const field of SWAP_STATUS_CONTEXT_FIELDS) assert.equal(observer.observe({ ...event, [field]: 'late' }), false, field)
  assert.equal(observer.observe({ ...event, type: 'completed' }), true)
  assert.equal(observer.observe(event), true, 'A -> B -> A is a real transition')
  assert.equal(observer.observe({ ...event, swapId: 'existing' }), false)
  assert.equal(observer.observe({ swapId: 'existing', type: 'completed' }), true)
})

test('bounded history retains recently observed swaps and never invents transitions for evicted swaps', () => {
  const observer = createSwapStatusObserver()
  for (let i = 0; i < 64; i++) observer.observe({ swapId: String(i), type: 'ls_transfer_pending' })
  observer.observe({ swapId: '0', type: 'ls_transfer_pending' })
  observer.observe({ swapId: '64', type: 'completed' })
  assert.equal(observer.observe({ swapId: '0', type: 'completed' }), true)
  assert.equal(observer.observe({ swapId: '1', type: 'completed' }), false)
})
