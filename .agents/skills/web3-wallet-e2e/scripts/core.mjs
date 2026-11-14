import { createHash } from 'node:crypto';
import { readFile, readdir, realpath } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

export function check(condition, code) {
  if (!condition) throw new Error(code);
}
export const sleep = ms => new Promise(done => setTimeout(done, ms));
export const walletNames = ['metamask', 'rabby', 'coinbase', 'phantom', 'argent-x', 'braavos', 'tronlink'];
export const nativeFieldNames = ['account', 'origin', 'network', 'requestType', 'message', 'amount', 'recipient', 'spender', 'token', 'fee', 'maximumFee', 'calldata', 'decoded', 'simulation'];
export const isApproval = scenario => ['confirmation-approval', 'signature-approval'].includes(scenario.kind);
export const requestKind = scenario => scenario.kind.startsWith('signature-') ? 'signature' : 'transaction';

function validateTarget(value) {
  check(value && ['role', 'testId', 'css', 'text'].includes(value.by) &&
    typeof value.value === 'string' && value.value.length > 0, 'INVALID_TARGET');
  if (value.by === 'role') check(typeof value.name === 'string' && value.name.length > 0, 'EXACT_ROLE_NAME_REQUIRED');
}

// The invoking agent supplies this only for a request already authorized by the user.
// A checked-in scenario alone is not permission to execute it.
export function validateExecution(scenario, args = []) {
  check(args.length === 0 || (args.length === 2 && args[0] === '--authorize' && args[1] === scenario.id), 'INVALID_AUTHORIZATION_ARGUMENTS');
  const authorized = args.length === 2;
  if (isApproval(scenario)) check(authorized, 'USER_AUTHORIZATION_REQUIRED');
  return authorized;
}

export function validateScenario(s) {
  check(s.schemaVersion === 1 && /^[a-z0-9-]+$/.test(s.id), 'INVALID_SCENARIO');
  check(['confirmation-rejection', 'confirmation-approval', 'signature-rejection', 'signature-approval', 'negative', 'connection'].includes(s.kind), 'INVALID_KIND');
  const url = new URL(s.url);
  check(!url.username && !url.password && (url.protocol === 'https:' ||
    (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))), 'UNSAFE_APP_URL');
  check(typeof s.expectedAccount === 'string' && /^0x[0-9a-f]{40}$/i.test(s.expectedAccount), 'PUBLIC_ACCOUNT_REQUIRED');
  check(Number.isSafeInteger(s.chainId) && s.chainId > 0, 'CHAIN_REQUIRED');
  for (const steps of [s.connectSteps, s.prepareSteps]) {
    check(Array.isArray(steps), 'STEPS_REQUIRED');
    for (const step of steps) {
      check(['click', 'fill', 'expect'].includes(step.action), 'UNSAFE_ACTION');
      validateTarget(step.target);
      if (step.action === 'fill') check(typeof step.value === 'string', 'FILL_VALUE_REQUIRED');
    }
  }
  validateTarget(s.after);
  if (!['connection', 'negative'].includes(s.kind)) {
    validateTarget(s.trigger);
    const required = requestKind(s) === 'signature'
      ? ['requestType', 'message']
      : ['requestType', 'network', 'amount', 'recipient'];
    if (s.kind === 'confirmation-approval') required.push('fee');
    check(s.expected && required.every(key => typeof s.expected[key] === 'string' && s.expected[key].length > 0), 'EXPECTED_WALLET_DETAILS_REQUIRED');
    for (const [key, value] of Object.entries(s.expected)) {
      check(nativeFieldNames.includes(key) && typeof value === 'string' && value.length > 0, 'INVALID_EXPECTED_FIELD');
    }
    if (requestKind(s) === 'signature') {
      check(s.nativeFields?.account && s.nativeFields?.origin && s.nativeFields?.message, 'SIGNATURE_FIELDS_REQUIRED');
    }
  }
  for (const [key, field] of Object.entries(s.nativeFields ?? {})) {
    check(nativeFieldNames.includes(key), 'INVALID_NATIVE_FIELD');
    validateTarget(field);
    check(field.attribute === undefined || (typeof field.attribute === 'string' && /^[a-zA-Z][\w:-]*$/.test(field.attribute)), 'INVALID_NATIVE_ATTRIBUTE');
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
export function assess(evidence, expected, kind = 'transaction') {
  const missing = [];
  const mismatches = [];
  const required = kind === 'signature'
    ? ['account', 'origin', 'requestType', 'message']
    : ['account', 'network', 'requestType', 'amount', 'recipient', 'fee', 'origin'];
  for (const key of new Set([...required, ...Object.keys(expected)])) {
    if (!evidence[key]) missing.push(key);
    else if (expected[key] !== undefined) {
      // Message/typed-data text is case-sensitive; only public addresses and hosts ignore case.
      const normalize = value => ['account', 'recipient', 'spender', 'origin'].includes(key) ? value.toLowerCase() : value;
      if (normalize(evidence[key]) !== normalize(expected[key])) mismatches.push(key);
    }
  }
  return { status: mismatches.length ? 'FAIL' : missing.length ? 'BLOCKED' : 'PASS', missing, mismatches };
}
export function resultStatus(checks) {
  if (checks.some(c => c === 'FAIL')) return 'FAIL';
  if (checks.some(c => c !== 'PASS')) return 'BLOCKED';
  return 'PASS';
}
