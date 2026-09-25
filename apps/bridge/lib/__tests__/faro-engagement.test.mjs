import assert from 'node:assert/strict'
import test from 'node:test'
import { createEngagementClock } from '../faro-engagement.ts'

test('idle tabs contribute at most 30 seconds; flushes are disjoint', () => {
    let time = 0
    const clock = createEngagementClock(() => time)
    clock.visibility(true)
    time = 10_000
    assert.equal(clock.flush(), 10_000)
    time = 100_000
    assert.equal(clock.flush(), 20_000)
    assert.equal(clock.flush(), 0)
})
test('hidden interaction does not accumulate background time', () => {
    let time = 0
    const clock = createEngagementClock(() => time)
    clock.visibility(true)
    time = 5000; clock.visibility(false)
    time = 50_000; clock.activity()
    time = 60_000; clock.visibility(true)
    time = 65_000
    assert.equal(clock.flush(), 10_000)
})
test('activity extends the window without filling the preceding idle gap', () => {
    let time = 0
    const clock = createEngagementClock(() => time)
    clock.visibility(true)
    time = 90_000; clock.activity()
    time = 95_000
    assert.equal(clock.flush(), 35_000)
})
