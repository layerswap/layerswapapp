import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assess, validateExecution, validateScenario } from '../scripts/core.mjs';
import { MetaMask } from '../scripts/metamask.mjs';
import { executeRequest } from '../scripts/workflow.mjs';
import { report } from '../scripts/report.mjs';

const account = `0x${'1'.repeat(40)}`;
const recipient = `0x${'2'.repeat(40)}`;
const extension = {id:'nkbihfbeogaeaoehlefnkodbefgpgknn', version:'13.54.0'};
function scenario(kind = 'confirmation-approval') {
  const signature = kind.startsWith('signature-');
  return {
    schemaVersion:1, id:'requested-action', kind, url:'https://example.org', expectedAccount:account, chainId:1,
    connectSteps:[], prepareSteps:[], trigger:{by:'text', value:'Request'}, after:{by:'text', value:'Done'},
    expected:signature
      ? {requestType:'Signature request', message:'Sign THIS message\nExactly.'}
      : {requestType:'transfer', network:'Ethereum', amount:'1 ETH', recipient, fee:'0.001 ETH'},
    ...(signature ? {nativeFields:{
      account:{by:'testId', value:'native-account', attribute:'title'},
      origin:{by:'testId', value:'native-origin'},
      message:{by:'testId', value:'native-message'},
    }} : {}),
  };
}

function harness({signature = false, label = 'Confirm', clickFails = false, enabled = true, count = 1} = {}) {
  const actions = [];
  const fields = {
    'advanced-details-displayed-nonce':'0', 'sender-address':account, 'recipient-address':recipient,
    'confirmation__details-network-name':'Ethereum', 'confirmation__details-origin':'example.org',
    'advanced-details-data-function':'transfer', 'first-gas-field':'0.001 ETH',
    'confirm-title-text':'Signature request', 'native-account':account, 'native-origin':'example.org',
    'native-message':'Sign THIS message\nExactly.',
  };
  let pending = true;
  let hash = signature ? '#/confirmation/signature-1' : '#/confirm-transaction/transaction-1';
  const node = id => ({
    count:async () => 1, isVisible:async () => id in fields,
    innerText:async () => fields[id], getAttribute:async () => fields[id], waitFor:async () => {},
  });
  const button = id => ({
    count:async () => count, isVisible:async () => true, isEnabled:async () => enabled,
    waitFor:async () => {}, innerText:async () => id === 'confirm-footer-cancel-button' ? 'Reject' : label,
    click:async () => {
      actions.push(id);
      if (clickFails) throw Error('CLICK_TIMEOUT');
      pending = false;
    },
  });
  const page = {
    url:() => `chrome-extension://${extension.id}/notification.html${hash}`,
    getByTestId:id => id.startsWith('confirm-footer-') ? button(id) : node(id),
    getByRole:role => role === 'heading'
      ? {count:async () => 1, innerText:async () => '1 ETH'}
      : {isVisible:async () => false},
    locator:() => ({count:async () => 0}), waitForURL:async () => {}, isClosed:() => !pending,
  };
  const wallet = new MetaMask({pages:() => pending ? [page] : []}, extension, 10);
  return {wallet, page, actions, fields, changeRequest:() => { hash += '-changed'; }};
}
function result() {
  return {checks:{}, intentionalAuthorizationActions:0, broadcastVerification:'unknown'};
}
function options(s, page) {
  return {authorized:true, requestId:new URL(page.url()).hash, nativeFields:s.nativeFields,
    expected:{...s.expected, account, origin:'example.org'}};
}

test('saved approvals require invocation authorization for that scenario', () => {
  for (const kind of ['confirmation-approval', 'signature-approval']) {
    const s = validateScenario(scenario(kind));
    assert.throws(() => validateExecution(s), /USER_AUTHORIZATION_REQUIRED/);
    assert.throws(() => validateExecution(s, ['--authorize', 'different-scenario']), /INVALID_AUTHORIZATION/);
    assert.equal(validateExecution(s, ['--authorize', s.id]), true);
  }
  for (const kind of ['confirmation-rejection', 'signature-rejection', 'connection', 'negative']) {
    assert.equal(validateExecution(validateScenario(scenario(kind))), false);
  }
});

test('approval schemas require transaction fees or native signature content and account selectors', () => {
  const transaction = scenario();
  delete transaction.expected.fee;
  assert.throws(() => validateScenario(transaction), /EXPECTED_WALLET_DETAILS_REQUIRED/);
  const signature = scenario('signature-approval');
  delete signature.nativeFields.account;
  assert.throws(() => validateScenario(signature), /SIGNATURE_FIELDS_REQUIRED/);
  const unknown = scenario('signature-approval');
  unknown.nativeFields.requestId = {by:'text', value:'invented'};
  assert.throws(() => validateScenario(unknown), /INVALID_NATIVE_FIELD/);
});

test('signature inspection reads native content and preserves message case and whitespace', async () => {
  const {wallet} = harness({signature:true});
  const s = scenario('signature-approval');
  const evidence = await wallet.inspect('signature', s.nativeFields);
  assert.equal(evidence.account, account);
  assert.equal(evidence.message, s.expected.message);
  assert.equal(assess(evidence, {...s.expected, account, origin:'example.org'}, 'signature').status, 'PASS');
  assert.deepEqual(assess(evidence, {message:s.expected.message.toLowerCase()}, 'signature').mismatches, ['message']);
  assert.deepEqual(assess(evidence, {message:s.expected.message.replace('\n', ' ')}, 'signature').mismatches, ['message']);
});

test('every expected field is checked, including spender, calldata and typed-data domain', () => {
  const evidence = {account, origin:'example.org', requestType:'Signature request', message:'domain: example.org'};
  assert.deepEqual(assess(evidence, {spender:recipient}, 'signature').missing, ['spender']);
  assert.deepEqual(assess({...evidence, calldata:'0x1234'}, {calldata:'0x5678'}, 'signature').mismatches, ['calldata']);
  assert.deepEqual(assess(evidence, {message:'domain: attacker.org'}, 'signature').mismatches, ['message']);
});

test('native transaction approval and signature approval each click once', async () => {
  for (const signature of [false, true]) {
    const {wallet, page, actions} = harness({signature});
    const s = scenario(signature ? 'signature-approval' : 'confirmation-approval');
    const approval = options(s, page);
    let attempts = 0;
    approval.onAttempt = () => attempts++;
    if (signature) await wallet.sign(approval);
    else await wallet.approve(approval);
    assert.deepEqual(actions, ['confirm-footer-button']);
    assert.equal(attempts, 1);
  }
});

test('native approval rejects absent authorization, changed IDs and mismatched scope without clicking', async () => {
  for (const variation of ['unauthorized', 'request', 'account', 'origin', 'recipient', 'fee']) {
    const {wallet, page, actions, changeRequest} = harness();
    const approval = options(scenario(), page);
    if (variation === 'unauthorized') approval.authorized = false;
    else if (variation === 'request') changeRequest();
    else approval.expected[variation] = 'wrong';
    await assert.rejects(wallet.approve(approval));
    assert.deepEqual(actions, []);
  }
});

test('ambiguous, disabled and unexpected approval controls do not authorize', async () => {
  for (const config of [{count:2}, {enabled:false}, {label:'Confirm and do something else'}]) {
    const {wallet, page, actions} = harness(config);
    await assert.rejects(wallet.approve(options(scenario(), page)), /AMBIGUOUS_WALLET_CONTROL|WALLET_CONTROL_UNAVAILABLE/);
    assert.deepEqual(actions, []);
  }
});

test('workflow reports transaction approvals and signatures separately from broadcast verification', async () => {
  for (const signature of [false, true]) {
    const {wallet} = harness({signature});
    const s = scenario(signature ? 'signature-approval' : 'confirmation-approval');
    const r = result();
    let contextChecks = 0;
    await executeRequest(wallet, s, r, {authorized:true, trigger:async () => {}, verifyContext:async () => contextChecks++});
    assert.equal(r.checks.requestApproved, 'PASS');
    assert.equal(r.checks.requestRejected, 'NOT_APPLICABLE');
    assert.equal(r.walletAction.completed, true);
    assert.equal(r.walletAction.action, signature ? 'sign' : 'approve');
    assert.equal(r.intentionalAuthorizationActions, 1);
    assert.equal(r.broadcastVerification, 'unknown');
    assert.equal(contextChecks, 1);
    assert.match(report(r), /Intentional authorization attempts: 1/);
  }
});

test('workflow leaves ordinary rejection available for transactions and signatures', async () => {
  for (const signature of [false, true]) {
    const {wallet, actions} = harness({signature});
    const r = result();
    await executeRequest(wallet, scenario(signature ? 'signature-rejection' : 'confirmation-rejection'), r, {trigger:async () => {}});
    assert.deepEqual(actions, ['confirm-footer-cancel-button']);
    assert.equal(r.intentionalAuthorizationActions, 0);
    assert.equal(r.checks.requestRejected, 'PASS');
  }
});

test('workflow does not trigger an unauthorized financial request', async () => {
  const {wallet, actions} = harness();
  let triggered = false;
  await assert.rejects(executeRequest(wallet, scenario(), result(), {trigger:async () => { triggered = true; }}), /USER_AUTHORIZATION_REQUIRED/);
  assert.equal(triggered, false);
  assert.deepEqual(actions, []);
});

test('details changed after capture prevent approval and reject the same request', async () => {
  const {wallet, fields, actions} = harness();
  const r = result();
  await assert.rejects(executeRequest(wallet, scenario(), r, {
    authorized:true, trigger:async () => {}, capture:async () => { fields['first-gas-field'] = '100 ETH'; },
  }), /REQUEST_DETAILS_MISMATCH/);
  assert.deepEqual(actions, ['confirm-footer-cancel-button']);
  assert.equal(r.checks.walletDetails, 'FAIL');
  assert.equal(r.intentionalAuthorizationActions, 0);
});

test('a changed origin is neither approved nor automatically rejected as an owned request', async () => {
  const {wallet, fields, actions} = harness();
  fields['confirmation__details-origin'] = 'other.example';
  const r = result();
  await assert.rejects(executeRequest(wallet, scenario(), r, {authorized:true, trigger:async () => {}}), /REQUEST_DETAILS_MISMATCH/);
  assert.deepEqual(actions, []);
  assert.equal(r.cleanup, 'UNRESOLVED_REQUEST_DO_NOT_RETRY');
});

test('a timed-out authorization is counted once and is not retried or followed by rejection', async () => {
  for (const signature of [false, true]) {
    const {wallet, actions} = harness({signature, clickFails:true});
    const r = result();
    await assert.rejects(executeRequest(wallet, scenario(signature ? 'signature-approval' : 'confirmation-approval'), r,
      {authorized:true, trigger:async () => {}}), /CLICK_TIMEOUT/);
    assert.deepEqual(actions, ['confirm-footer-button']);
    assert.equal(r.intentionalAuthorizationActions, 1);
    assert.equal(r.walletAction.completed, false);
    assert.equal(r.cleanup, 'UNRESOLVED_REQUEST_DO_NOT_RETRY');
  }
});

async function runCli(scenarioKind, {authorize = true, mode = ''} = {}) {
  const root = await mkdtemp(resolve(tmpdir(), 'wallet-runner-test-'));
  try {
    const s = scenario(scenarioKind);
    await writeFile(resolve(root, 'scenario.json'), JSON.stringify(s));
    await writeFile(resolve(root, 'config.json'), JSON.stringify({
      wallet:'metamask', walletName:'fixture',
      runtimeModule:fileURLToPath(new URL('./fixtures/runtime.mjs', import.meta.url)),
    }));
    const args = [fileURLToPath(new URL('../scripts/test.mjs', import.meta.url)), resolve(root, 'config.json'), resolve(root, 'scenario.json')];
    if (authorize) args.push('--authorize', s.id);
    const child = spawnSync(process.execPath, args, {
      encoding:'utf8', timeout:10000,
      env:{...process.env, WALLET_RUNNER_FIXTURE_ROOT:root, WALLET_RUNNER_FIXTURE_MODE:mode},
    });
    assert.ifError(child.error);
    const summary = JSON.parse(child.stdout.trim());
    const saved = JSON.parse(await readFile(resolve(summary.artifactDir, 'result.json'), 'utf8'));
    const actions = await readFile(resolve(root, 'actions.log'), 'utf8').catch(() => '');
    const marker = await readFile(resolve(root, 'unresolved-request.json'), 'utf8').then(JSON.parse).catch(() => null);
    return {exitCode:child.status, saved, actions:actions.trim().split('\n').filter(Boolean), marker};
  } finally {
    await rm(root, {recursive:true, force:true});
  }
}

test('CLI runs authorized transaction/signature scenarios and saves actual outcomes', async () => {
  for (const kind of ['confirmation-approval', 'signature-approval']) {
    const {exitCode, saved, actions, marker} = await runCli(kind);
    assert.equal(exitCode, 0);
    assert.equal(saved.status, 'PASS');
    assert.equal(saved.checks.requestApproved, 'PASS');
    assert.equal(saved.checks.appHandledResult, 'PASS');
    assert.equal(saved.intentionalAuthorizationActions, 1);
    assert.deepEqual(actions, ['launch', 'trigger', 'confirm-footer-button', 'close']);
    assert.equal(marker, null);
  }
});

test('CLI denies unauthorized approval before launch and keeps rejection scenarios working', async () => {
  const denied = await runCli('signature-approval', {authorize:false});
  assert.equal(denied.exitCode, 1);
  assert.equal(denied.saved.actualResult, 'USER_AUTHORIZATION_REQUIRED');
  assert.deepEqual(denied.actions, []);
  for (const kind of ['confirmation-rejection', 'signature-rejection']) {
    const rejected = await runCli(kind, {authorize:false});
    assert.equal(rejected.exitCode, 0);
    assert.equal(rejected.saved.checks.requestRejected, 'PASS');
    assert.equal(rejected.saved.intentionalAuthorizationActions, 0);
    assert.deepEqual(rejected.actions, ['launch', 'trigger', 'confirm-footer-cancel-button', 'close']);
  }
});

test('CLI persists uncertain authorization and follow-up requests without approving again', async () => {
  for (const mode of ['timeout', 'followup']) {
    const {exitCode, saved, actions, marker} = await runCli('confirmation-approval', {mode});
    assert.equal(exitCode, 1);
    assert.equal(saved.status, 'BLOCKED');
    assert.equal(saved.walletAction.completed, mode === 'followup');
    assert.equal(saved.intentionalAuthorizationActions, 1);
    assert.equal(saved.cleanup, 'UNRESOLVED_REQUEST_DO_NOT_RETRY');
    assert.equal(marker.scenarioId, 'requested-action');
    assert.deepEqual(actions, ['launch', 'trigger', 'confirm-footer-button', 'close']);
  }
});
