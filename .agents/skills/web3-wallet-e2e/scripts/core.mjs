import { createHash } from 'node:crypto';
import { readFile, readdir, realpath } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

export function check(condition, code) {
  if (!condition) throw new Error(code);
}
export const sleep = ms => new Promise(done => setTimeout(done, ms));
export const walletNames = ['metamask', 'rabby', 'coinbase', 'phantom', 'argent-x', 'braavos', 'tronlink'];
export function validateScenario(s) {
  check(s.schemaVersion === 1 && /^[a-z0-9-]+$/.test(s.id), 'INVALID_SCENARIO');
  check(['confirmation-rejection', 'negative', 'connection'].includes(s.kind), 'INVALID_KIND');
  const url = new URL(s.url);
  check(!url.username && !url.password && (url.protocol === 'https:' ||
    (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))), 'UNSAFE_APP_URL');
  check(typeof s.expectedAccount === 'string' && /^0x[0-9a-f]{40}$/i.test(s.expectedAccount), 'PUBLIC_ACCOUNT_REQUIRED');
  check(Number.isSafeInteger(s.chainId) && s.chainId > 0, 'CHAIN_REQUIRED');
  for (const steps of [s.connectSteps, s.prepareSteps]) {
    check(Array.isArray(steps), 'STEPS_REQUIRED');
    for (const step of steps) {
      check(['click', 'fill', 'expect'].includes(step.action), 'UNSAFE_ACTION');
      check(step.target && ['role', 'testId', 'css', 'text'].includes(step.target.by) &&
        typeof step.target.value === 'string' && step.target.value.length > 0, 'INVALID_TARGET');
      if (step.target.by === 'role') check(typeof step.target.name === 'string', 'EXACT_ROLE_NAME_REQUIRED');
      if (step.action === 'fill') check(typeof step.value === 'string', 'FILL_VALUE_REQUIRED');
    }
  }
  check(s.after?.by && s.after?.value, 'EXPECTED_APP_RESULT_REQUIRED');
  if (s.kind === 'confirmation-rejection') {
    check(s.trigger?.by && s.trigger?.value, 'TRIGGER_REQUIRED');
    check(s.expected && ['requestType', 'network', 'amount', 'recipient'].every(k => typeof s.expected[k] === 'string' && s.expected[k]), 'EXPECTED_WALLET_DETAILS_REQUIRED');
  }
  return s;
}
export function target(page, t) {
  if (t.by === 'role') return page.getByRole(t.value, { name: t.name, exact: true });
  if (t.by === 'testId') return page.getByTestId(t.value);
  if (t.by === 'text') return page.getByText(t.value, { exact: true });
  check(t.by === 'css', 'INVALID_TARGET');
  return page.locator(t.value);
}
export async function appSteps(page, steps, origin) {
  for (const step of steps) {
    check(new URL(page.url()).origin === origin, 'APP_ORIGIN_CHANGED');
    const node = target(page, step.target);
    check(await node.count() === 1, 'AMBIGUOUS_APP_CONTROL');
    if (step.action === 'click') await node.click();
    else if (step.action === 'fill') await node.fill(step.value);
    else await node.waitFor({ state: 'visible' });
  }
}
// Same deterministic directory digest used by the reference framework. No wallet data read.
export async function extensionIdentity(directory) {
  const path = await realpath(directory);
  const manifest = JSON.parse(await readFile(resolve(path, 'manifest.json'), 'utf8'));
  check(manifest.manifest_version === 3 && manifest.key, 'UNSUPPORTED_EXTENSION_MANIFEST');
  const bytes = createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest().subarray(0, 16);
  const id = [...bytes].flatMap(b => [b >> 4, b & 15]).map(n => String.fromCharCode(97 + n)).join('');
  const hash = createHash('sha256');
  async function walk(dir) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === '_metadata') continue;
      check(!entry.isSymbolicLink(), 'EXTENSION_SYMLINK');
      const file = resolve(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else { hash.update(relative(path, file)); hash.update('\0'); hash.update(await readFile(file)); hash.update('\0'); }
    }
  }
  await walk(path);
  return { path, id, version: manifest.version_name ?? manifest.version, sha256: hash.digest('hex') };
}
export function assess(evidence, expected) {
  const missing = [];
  const mismatches = [];
  for (const key of ['account', 'network', 'requestType', 'amount', 'recipient', 'fee', 'origin']) {
    if (!evidence[key]) missing.push(key);
    else if (expected[key] && evidence[key].toLowerCase() !== expected[key].toLowerCase()) mismatches.push(key);
  }
  return { status: mismatches.length ? 'FAIL' : missing.length ? 'BLOCKED' : 'PASS', missing, mismatches };
}
export function resultStatus(checks) {
  if (checks.some(c => c === 'FAIL')) return 'FAIL';
  if (checks.some(c => c !== 'PASS')) return 'BLOCKED';
  return 'PASS';
}
