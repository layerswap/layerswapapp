import assert from 'node:assert/strict'
import test from 'node:test'
import {
    baseUnitsToNumber,
    bytesToHex,
    ceilUsd,
    checkStorageIsAvailable,
    classNames,
    floorUsd,
    formatUsd,
    getDateDifferenceString,
    groupBy,
    isDiffByPercent,
    isGuid,
    isInIframe,
} from '../dist/esm/common.js'

test('binary and base-unit helpers preserve exact values', () => {
    assert.equal(bytesToHex(Uint8Array.from([0, 15, 16, 255])), '000f10ff')
    assert.equal(baseUnitsToNumber(100n, 7), 0.00001)
    assert.equal(baseUnitsToNumber(-12345n, 2), -123.45)
    assert.throws(() => baseUnitsToNumber(1n, -1), RangeError)
})

test('collection and class-name helpers retain their existing behavior', () => {
    assert.equal(classNames('one', false, undefined, null, 'two'), 'one two')
    assert.deepEqual(groupBy([1, 2, 3, 4], value => value % 2), { 0: [2, 4], 1: [1, 3] })
})

test('formatting and validation helpers retain their existing behavior', () => {
    assert.equal(formatUsd(1.5), '$1.50')
    assert.equal(formatUsd(0.001), '<$0.01')
    assert.equal(floorUsd(0.299), '0.29')
    assert.equal(ceilUsd(0.17001), '0.18')
    assert.equal(getDateDifferenceString(new Date(2024, 0, 1), new Date(2025, 0, 2)), '(1 year, 1 day ago)')
    assert.equal(isGuid('{fa3f93eb-9fea-44f3-a8a6-a5ced0f6d646}'), true)
    assert.equal(isGuid('not-a-guid'), false)
    assert.equal(isDiffByPercent(100, 111, 10), true)
})

test('browser helpers are safe during server rendering', () => {
    assert.equal(checkStorageIsAvailable('localStorage'), false)
    assert.equal(isInIframe(), false)
})
