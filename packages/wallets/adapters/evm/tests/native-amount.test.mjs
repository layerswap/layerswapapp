import assert from 'node:assert/strict'
import test from 'node:test'
import { parseNativeAmount } from '../dist/esm/evmUtils/parseNativeAmount.js'

for (const [input, expected] of [
    [1e-7, 100_000_000_000n],
    ['1e-7', 100_000_000_000n],
    ['1.234567890123456789e0', 1_234_567_890_123_456_789n],
    ['1.234567890123e-6', 1_234_567_890_123n],
    ['0.100000000000000001', 100_000_000_000_000_001n],
    [1e21, 10n ** 39n],
]) {
    test(`native amount ${input} preserves base units`, () => {
        assert.equal(parseNativeAmount(input, 18), expected)
    })
}
test('backend base units take precedence over rounded display amounts', () => {
    assert.equal(parseNativeAmount(1e-7, 18, '100000000001'), 100_000_000_001n)
})
for (const amount of ['NaN', 'Infinity', 'invalid', '1e9999999']) {
    test(`invalid native amount ${amount} rejects`, () => {
        assert.throws(() => parseNativeAmount(amount, 18))
    })
}
