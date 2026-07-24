import assert from 'node:assert/strict';
import test from 'node:test';

const { manifestFreshness, MANIFEST_CLOCK_SKEW_MS } = await import('../dist/esm/manifest.js');

const base = { version: '1.0.0', remoteEntry: './remoteEntry.js' };
const now = Date.parse('2026-07-20T12:00:00Z');

test('a manifest without expiresAt is not fresh', () => {
  assert.equal(manifestFreshness(base, now), 'missing-expiry');
  assert.equal(manifestFreshness({ ...base, expiresAt: 'not-a-date' }, now), 'missing-expiry');
});

test('a manifest inside its validity window is fresh', () => {
  const expiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  assert.equal(manifestFreshness({ ...base, expiresAt }, now), 'fresh');
});

test('a manifest past expiry plus clock skew is expired', () => {
  const expiresAt = new Date(now - MANIFEST_CLOCK_SKEW_MS - 1000).toISOString();
  assert.equal(manifestFreshness({ ...base, expiresAt }, now), 'expired');
});

test('clock skew is tolerated just past expiry', () => {
  const expiresAt = new Date(now - MANIFEST_CLOCK_SKEW_MS + 1000).toISOString();
  assert.equal(manifestFreshness({ ...base, expiresAt }, now), 'fresh');
});
