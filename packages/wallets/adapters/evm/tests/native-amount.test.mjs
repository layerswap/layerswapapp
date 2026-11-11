import assert from 'node:assert/strict'
import test from 'node:test'
import { parseNativeAmount } from '../dist/esm/evmUtils/parseNativeAmount.js'

for (const [input, expected] of [
    [1e-7, 100_000_000_000n],
    ['1e-7', 100_000_000_000n],
    [9.99e-7, 999_000_000_000n],
    [1.234567890123e-7, 123_456_789_012n],
    ['1.234567890123e-6', 1_234_567_890_123n],
    [1e-18, 1n],
    // Plain decimals never pass through toFixed, so binary expansion artefacts stay out.
    [0.1, 100_000_000_000_000_000n],
    [0.3, 300_000_000_000_000_000n],
    ['0.100000000000000001', 100_000_000_000_000_001n],
    [1234.5678, 1_234_567_800_000_000_000_000n],
]) {
    test(`native amount ${input} preserves base units`, () => {
        assert.equal(parseNativeAmount(input, 18), expected)
    })
}
test('digits below one wei round by the binary value, never by more than one wei', () => {
    // 49.5 wei: the double sits just under the half, so it rounds down where
    // a decimal string would round half up. Upstream truncation never sends this.
    assert.equal(parseNativeAmount(4.95e-17, 18), 49n)
    assert.equal(parseNativeAmount('0.0000000000000000495', 18), 50n)
})
test('backend base units take precedence over rounded display amounts', () => {
    assert.equal(parseNativeAmount(1e-7, 18, '100000000001'), 100_000_000_001n)
})
for (const amount of ['NaN', 'Infinity', 'invalid', '1e9999999', 1e21]) {
    test(`unparseable native amount ${amount} rejects`, () => {
        assert.throws(() => parseNativeAmount(amount, 18))
    })
}
