import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,stat,chmod,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createLocalKey,prepareWallet,fillWalletPassword,captureRecovery,fillRecoveryChallenge,completeWallet} from '../scripts/vault.mjs';
import {extensionIdentity} from '../scripts/extension.mjs';

const extensionId='nkbihfbeogaeaoehlefnkodbefgpgknn';
const words=['alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel','india','juliet','kilo','lima']; // synthetic, not a wallet seed
function locator(value,{url=`chrome-extension://${extensionId}/home.html#/onboarding`,fill=()=>{}}={}) {
  return {page:()=>({url:()=>url}),innerText:async()=>value,inputValue:async()=>value,fill:async value=>fill(value)};
}
async function fixture(fn) {
  const dir=await mkdtemp(resolve(tmpdir(),'wallet-provision-test-'));
  const ref={root:resolve(dir,'vaults'),id:'test-wallet',keyPath:resolve(dir,'keys/local.key')};
  try {await createLocalKey(ref.keyPath);await prepareWallet(ref);await fn(ref,dir);}finally{await rm(dir,{recursive:true,force:true});}
}
const capture=ref=>captureRecovery(ref,{words:words.map(word=>locator(word)),expectedCount:12,extensionId});

test('new generated password is encrypted, private and fills only native UI without returning it',async()=>fixture(async ref=>{
  let filled;
  assert.equal(await fillWalletPassword(ref,[locator('',{fill:value=>{filled=value;}})],extensionId),undefined);
  assert.ok(filled.length>=32);
  const file=resolve(ref.root,ref.id+'.credentials.enc.json');
  assert.ok(!(await readFile(file,'utf8')).includes(filled));
  assert.equal((await stat(file)).mode&0o777,0o600);
  assert.equal((await stat(ref.keyPath)).mode&0o777,0o600);
  assert.equal((await stat(ref.root)).mode&0o777,0o700);
}));
test('recovery capture returns metadata only; challenge uses exact 1-based positions',async()=>fixture(async ref=>{
  const metadata=await capture(ref);
  assert.deepEqual(metadata,{walletId:ref.id,recoverySaved:true,wordCount:12});
  const file=await readFile(resolve(ref.root,ref.id+'.credentials.enc.json'),'utf8');
  assert.ok(words.every(word=>!file.includes('"'+word+'"')));
  let filled;
  assert.equal(await fillRecoveryChallenge(ref,[{wordNumber:3,locator:locator('',{fill:value=>{filled=value;}})}],extensionId),undefined);
  assert.equal(filled,'charlie');
  await assert.rejects(fillRecoveryChallenge(ref,[{wordNumber:0,locator:locator('')}],extensionId),/INVALID_WORD_NUMBER/);
}));
test('existing credentials and key are never overwritten',async()=>fixture(async ref=>{
  await assert.rejects(prepareWallet(ref),{code:'EEXIST'});
  await assert.rejects(createLocalKey(ref.keyPath),{code:'EEXIST'});
  await capture(ref);
  await assert.rejects(capture(ref),/RECOVERY_ALREADY_SAVED/);
}));
test('complete requires saved recovery and a full public address',async()=>fixture(async ref=>{
  const address='0x'+'1'.repeat(40);
  await assert.rejects(completeWallet(ref,address),/RECOVERY_NOT_SAVED/);
  await capture(ref);
  await assert.rejects(completeWallet(ref,'0x111...111'),/FULL_EVM_PUBLIC_ADDRESS_REQUIRED/);
  const result=await completeWallet(ref,address);
  assert.equal(result.publicAddress,address);
  assert.equal(result.status,'complete');
  assert.equal(result.password,undefined);assert.equal(result.recoveryWords,undefined);
}));
test('web pages cannot receive passwords or recovery words',async()=>fixture(async ref=>{
  let filled=false;
  const bad=locator('alpha',{url:'https://example.org/',fill:()=>{filled=true;}});
  await assert.rejects(fillWalletPassword(ref,[bad],extensionId),/SECRET_SURFACE_NOT_TRUSTED_EXTENSION/);
  await assert.rejects(captureRecovery(ref,{words:words.map(()=>bad),expectedCount:12,extensionId}),/SECRET_SURFACE_NOT_TRUSTED_EXTENSION/);
  assert.equal(filled,false);
}));
test('wrong count, number labels and broad-permission key fail closed',async()=>fixture(async ref=>{
  await assert.rejects(captureRecovery(ref,{words:[],expectedCount:12,extensionId}),/WORD_COUNT_MISMATCH/);
  await assert.rejects(captureRecovery(ref,{words:words.map(w=>locator('1. '+w)),expectedCount:12,extensionId}),/LAYOUT_UNSUPPORTED/);
  await chmod(ref.keyPath,0o644);
  await assert.rejects(fillWalletPassword(ref,[locator('')],extensionId),/PRIVATE_KEY_FILE_REQUIRED/);
}));
test('ciphertext tampering and a wrong key are rejected without outputting plaintext',async()=>fixture(async(ref,dir)=>{
  const file=resolve(ref.root,ref.id+'.credentials.enc.json');
  const original=JSON.parse(await readFile(file,'utf8'));
  const tampered={...original,tag:Buffer.alloc(16).toString('base64')};
  await writeFile(file,JSON.stringify(tampered),{mode:0o600});
  await assert.rejects(fillWalletPassword(ref,[locator('')],extensionId),/VAULT_AUTHENTICATION_FAILED/);
  await writeFile(file,JSON.stringify(original),{mode:0o600});
  const wrong=resolve(dir,'other/key');await createLocalKey(wrong);
  await assert.rejects(fillWalletPassword({...ref,keyPath:wrong},[locator('')],extensionId),/VAULT_AUTHENTICATION_FAILED/);
}));
test('extension identity is deterministic and rejects symlinked code',async()=>{
  const dir=await mkdtemp(resolve(tmpdir(),'extension-identity-'));
  try {
    await writeFile(resolve(dir,'manifest.json'),JSON.stringify({manifest_version:3,key:Buffer.from('synthetic public key').toString('base64'),version:'1.0.0'}));
    await writeFile(resolve(dir,'background.js'),'// synthetic extension');
    assert.deepEqual(await extensionIdentity(dir),await extensionIdentity(dir));
    await symlink(resolve(dir,'background.js'),resolve(dir,'linked.js'));
    await assert.rejects(extensionIdentity(dir),/EXTENSION_SYMLINK/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('native fill failures cannot leak password or word through browser call-log errors',async()=>fixture(async ref=>{
  const bad=locator('',{fill:value=>{throw new Error('Browser call log contains '+value);}});
  await assert.rejects(fillWalletPassword(ref,[bad],extensionId),/^Error: NATIVE_PASSWORD_FILL_FAILED$/);
  await capture(ref);
  await assert.rejects(fillRecoveryChallenge(ref,[{wordNumber:3,locator:bad}],extensionId),/^Error: NATIVE_RECOVERY_CHALLENGE_FAILED$/);
}));

test('Starknet and Fuel addresses complete with an explicit family rather than EVM rules',async()=>fixture(async ref=>{
  const address='0x0'+'1'.repeat(63);
  await capture(ref);
  await assert.rejects(completeWallet(ref,address),/FULL_EVM_PUBLIC_ADDRESS_REQUIRED/);
  const result=await completeWallet(ref,address,{family:'starknet'});
  assert.equal(result.publicAddress,address);assert.equal(result.chainFamily,'starknet');
  assert.equal(result.addressValidation,'format-only');
}));
test('checksum-based families require an app/vendor validator and preserve the selected family',async()=>fixture(async ref=>{
  await capture(ref);
  await assert.rejects(completeWallet(ref,'SyntheticNativeAddress',{family:'solana'}),/CHAIN_ADDRESS_VALIDATOR_REQUIRED/);
  let observed;
  const result=await completeWallet(ref,'SyntheticNativeAddress',{family:'solana',validator:(address,family)=>{
    observed={address,family};return true;
  }});
  assert.deepEqual(observed,{address:'SyntheticNativeAddress',family:'solana'});
  assert.equal(result.chainFamily,'solana');assert.equal(result.addressValidation,'provided-validator');
}));
test('generic installer accepts an independently pinned non-MetaMask extension ID',async()=>{
  const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');
  const exec=promisify(execFile);
  const dir=await mkdtemp(resolve(tmpdir(),'generic-extension-'));
  try {
    const source=resolve(dir,'source');await mkdir(source);
    await writeFile(resolve(source,'manifest.json'),JSON.stringify({manifest_version:3,key:Buffer.from('unit-test-extension-public-key').toString('base64'),version:'2.0.0'}));
    const identity=await extensionIdentity(source);
    assert.notEqual(identity.id,extensionId);
    const script=new URL('../scripts/install-extension.mjs',import.meta.url).pathname;
    await assert.rejects(exec(process.execPath,[script,source,resolve(dir,'bad'),'2.0.0',identity.sha256,'a'.repeat(32)]));
    const {stdout}=await exec(process.execPath,[script,source,resolve(dir,'installed'),'2.0.0',identity.sha256,identity.id]);
    assert.equal(JSON.parse(stdout).id,identity.id);
    assert.equal((await extensionIdentity(resolve(dir,'installed'))).sha256,identity.sha256);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('discovery expands aliases across source-backed families and distinguishes hardware',async()=>{
  const {discoverWallet}=await import('../scripts/discover-wallets.mjs');
  const dir=await mkdtemp(resolve(tmpdir(),'wallet-catalog-'));
  try {
    await writeFile(resolve(dir,'providers.ts'),'argentX phantom ledger bitcoin');
    const catalog={entries:[
      {name:'Ready X',aliases:['Argent X'],families:['starknet'],source:'providers.ts',probe:'argentX',kind:'browser-candidate'},
      {name:'Phantom',aliases:[],families:['solana'],source:'providers.ts',probe:'phantom',kind:'browser-candidate'},
      {name:'Ledger',aliases:[],families:['solana'],source:'providers.ts',probe:'ledger',kind:'external-device'},
      {name:'Ready X',aliases:[],families:['bitcoin'],source:'providers.ts',probe:'bitcoin',kind:'browser-candidate'}
    ]};
    const ready=await discoverWallet(dir,'Argent X',{catalog});
    assert.deepEqual(ready.families,['starknet','bitcoin']);
    assert.equal(ready.onboarding,'NOT_LIVE_VALIDATED');
    assert.equal((await discoverWallet(dir,'Ledger',{catalog})).setupApproach,'USER_ACTION_OR_SEPARATE_AUTHORIZATION_MAY_BE_REQUIRED');
    assert.equal((await discoverWallet(dir,'New compatible wallet',{catalog})).compatibility,'DISCOVERY_REQUIRED');
    const dynamic=await discoverWallet(dir,'New wallet',{catalog,registry:[{name:'New wallet',chains:['solana:test','cosmos:test'],chrome_store:'https://example.org'}]});
    assert.equal(dynamic.compatibility,'REGISTRY_CANDIDATE');assert.deepEqual(dynamic.families,['solana']);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('vault password environment injection is scoped and cannot return secret-bearing failures',async()=>fixture(async ref=>{
  const {withWalletPasswordEnvironment}=await import('../scripts/vault.mjs');
  const previous=process.env.WALLET_TEST_PASSWORD;
  process.env.WALLET_TEST_PASSWORD='synthetic-prior-value';
  try {
    await assert.rejects(withWalletPasswordEnvironment(ref,async()=>{
      assert.notEqual(process.env.WALLET_TEST_PASSWORD,'synthetic-prior-value');
      throw Error('call log '+process.env.WALLET_TEST_PASSWORD);
    }),/^Error: WALLET_UNLOCK_FAILED$/);
    assert.equal(process.env.WALLET_TEST_PASSWORD,'synthetic-prior-value');
  }finally{if(previous===undefined)delete process.env.WALLET_TEST_PASSWORD;else process.env.WALLET_TEST_PASSWORD=previous;}
}));
