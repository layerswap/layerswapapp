import {validatePublicAddress} from './address.mjs';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { mkdir, lstat, open, readFile, rename, unlink } from 'node:fs/promises';
import { resolve, dirname, isAbsolute } from 'node:path';

export function check(value, code) {
  if (!value) throw new Error(code);
}
async function privateDirectory(path) {
  check(isAbsolute(path), 'ABSOLUTE_PRIVATE_DIRECTORY_REQUIRED');
  await mkdir(path, {recursive:true,mode:0o700});
  const stat=await lstat(path);
  check(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0, 'PRIVATE_DIRECTORY_REQUIRED');
}
async function writePrivate(path, value) {
  const file=await open(path,'wx',0o600);
  try {await file.writeFile(value);await file.sync();} finally {await file.close();}
}
export async function createLocalKey(keyPath) {
  check(isAbsolute(keyPath), 'ABSOLUTE_KEY_PATH_REQUIRED');
  await privateDirectory(dirname(keyPath));
  await writePrivate(keyPath, randomBytes(32).toString('base64')+'\n');
  return {keyPath, storage:'local-key-file', note:'Keep key separate from vault backups; same-user host compromise can read both.'};
}
async function keyBytes(keyPath) {
  let encoded=process.env.WALLET_PROVISIONING_VAULT_KEY;
  if (!encoded) {
    check(keyPath && isAbsolute(keyPath),'VAULT_KEY_REQUIRED');
    const stat=await lstat(keyPath);
    check(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0,'PRIVATE_KEY_FILE_REQUIRED');
    encoded=(await readFile(keyPath,'utf8')).trim();
  }
  check(/^[A-Za-z0-9+/]{43}=$/.test(encoded),'INVALID_VAULT_KEY');
  const key=Buffer.from(encoded,'base64');
  check(key.length === 32,'INVALID_VAULT_KEY');
  return key;
}
function location(root,id) {
  check(isAbsolute(root) && /^[a-z0-9][a-z0-9-]{0,63}$/.test(id),'INVALID_VAULT_REFERENCE');
  return resolve(root,`${id}.credentials.enc.json`);
}
function encrypt(secret,key,id) {
  const nonce=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',key,nonce);
  cipher.setAAD(Buffer.from(`web3-wallet-provision:v1:${id}`));
  const plaintext=Buffer.from(JSON.stringify(secret));
  try {
    const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);
    return JSON.stringify({schemaVersion:1,id,algorithm:'aes-256-gcm',nonce:nonce.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')},null,2);
  } finally {plaintext.fill(0);}
}
async function decrypt(ref) {
  const file=location(ref.root,ref.id);
  const stat=await lstat(file);
  check(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0,'PRIVATE_VAULT_FILE_REQUIRED');
  const data=JSON.parse(await readFile(file,'utf8'));
  check(data.schemaVersion === 1 && data.algorithm === 'aes-256-gcm' && data.id === ref.id,'INVALID_VAULT_FORMAT');
  const key=await keyBytes(ref.keyPath);
  let plaintext;
  try {
    const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(data.nonce,'base64'));
    decipher.setAAD(Buffer.from(`web3-wallet-provision:v1:${ref.id}`));
    decipher.setAuthTag(Buffer.from(data.tag,'base64'));
    plaintext=Buffer.concat([decipher.update(Buffer.from(data.ciphertext,'base64')),decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  } catch {throw new Error('VAULT_AUTHENTICATION_FAILED');}
  finally {key.fill(0);plaintext?.fill(0);}
}
export async function prepareWallet(ref) {
  const file=location(ref.root,ref.id);
  await privateDirectory(ref.root);
  const key=await keyBytes(ref.keyPath); // must work before any native wallet creation
  try {
    const secret={walletId:ref.id,status:'password-prepared',password:randomBytes(24).toString('base64url'),recoveryWords:null,publicAddress:null};
    await writePrivate(file,encrypt(secret,key,ref.id));
    const directory=await open(dirname(file),'r');
    try {await directory.sync();} finally {await directory.close();}
    const verified=await decrypt(ref);
    check(verified.password===secret.password && verified.status==='password-prepared','PASSWORD_BACKUP_VERIFICATION_FAILED');
    verified.password=null;
    return {walletId:ref.id,vaultPath:file,status:'password-prepared'};
  } finally {key.fill(0);}
}
async function update(ref, change) {
  const file=location(ref.root,ref.id);
  const lock=await open(file+'.lock','wx',0o600);
  const temporary=file+'.'+randomBytes(8).toString('hex')+'.tmp';
  let secret,key;
  try {
    secret=await decrypt(ref);
    await change(secret);
    key=await keyBytes(ref.keyPath);
    await writePrivate(temporary,encrypt(secret,key,ref.id));
    await rename(temporary,file);
    const directory=await open(dirname(file),'r');
    try {await directory.sync();} finally {await directory.close();}
  } finally {
    key?.fill(0);
    if(secret){secret.password=null;secret.recoveryWords=null;}
    await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});
    await lock.close();await unlink(file+'.lock');
  }
}
function sanitizedUiError(error,fallback) {
  const known=new Set(['INVALID_EXTENSION_ID','SECRET_SURFACE_NOT_TRUSTED_EXTENSION','RECOVERY_ALREADY_SAVED','RECOVERY_NOT_SAVED','RECOVERY_WORD_LAYOUT_UNSUPPORTED','INVALID_WORD_NUMBER','RECOVERY_BACKUP_VERIFICATION_FAILED']);
  return new Error(known.has(error.message)?error.message:fallback);
}
function nativeSurface(locator,extensionId) {
  check(/^[a-p]{32}$/.test(extensionId),'INVALID_EXTENSION_ID');
  const url=new URL(locator.page().url());
  check(url.protocol==='chrome-extension:' && url.hostname===extensionId,'SECRET_SURFACE_NOT_TRUSTED_EXTENSION');
}
export async function fillWalletPassword(ref,locators,extensionId) {
  check(Array.isArray(locators) && locators.length>=1 && locators.length<=2,'PASSWORD_CONTROLS_REQUIRED');
  const secret=await decrypt(ref);
  try {
    for(const locator of locators){nativeSurface(locator,extensionId);await locator.fill(secret.password);}
  } catch(error) {throw sanitizedUiError(error,'NATIVE_PASSWORD_FILL_FAILED');}
  finally {secret.password=null;secret.recoveryWords=null;}
  // No return value: secret-bearing values must never become tool output.
}
export async function captureRecovery(ref,{words,expectedCount=12,extensionId,read='text'}) {
  check([12,18,24].includes(expectedCount) && words.length===expectedCount,'RECOVERY_WORD_COUNT_MISMATCH');
  check(['text','input'].includes(read),'INVALID_WORD_READER');
  const captured=[];
  try {
    for(const locator of words){
      nativeSurface(locator,extensionId);
      const value=(read==='input'?await locator.inputValue():await locator.innerText()).trim();
      check(/^[a-z]+$/.test(value),'RECOVERY_WORD_LAYOUT_UNSUPPORTED');
      captured.push(value);
    }
    await update(ref,secret=>{
      check(secret.status==='password-prepared','RECOVERY_ALREADY_SAVED');
      secret.recoveryWords=captured;
      secret.status='recovery-saved';
    });
    const verified=await decrypt(ref);
    try {check(verified.recoveryWords?.length===captured.length && captured.every((word,index)=>word===verified.recoveryWords[index]),'RECOVERY_BACKUP_VERIFICATION_FAILED');}
    finally {verified.password=null;verified.recoveryWords=null;}
  } catch(error) {throw sanitizedUiError(error,'NATIVE_RECOVERY_CAPTURE_FAILED');}
  finally {captured.fill('');}
  return {walletId:ref.id,recoverySaved:true,wordCount:expectedCount};
}
export async function fillRecoveryChallenge(ref,slots,extensionId) {
  check(Array.isArray(slots) && slots.length>0,'RECOVERY_CHALLENGE_REQUIRED');
  const secret=await decrypt(ref);
  try {
    check(Array.isArray(secret.recoveryWords),'RECOVERY_NOT_SAVED');
    for(const slot of slots){
      check(Number.isInteger(slot.wordNumber) && slot.wordNumber>=1 && slot.wordNumber<=secret.recoveryWords.length,'INVALID_WORD_NUMBER');
      nativeSurface(slot.locator,extensionId);
      await slot.locator.fill(secret.recoveryWords[slot.wordNumber-1]);
    }
  } catch(error) {throw sanitizedUiError(error,'NATIVE_RECOVERY_CHALLENGE_FAILED');}
  finally {secret.password=null;secret.recoveryWords=null;}
}
export async function completeWallet(ref,publicAddress,options={}) {
  const family=options.family??'evm';
  check(/^[a-z][a-z0-9-]*$/.test(family),'CHAIN_FAMILY_REQUIRED');
  const valid=await validatePublicAddress(publicAddress,options);
  check(valid,family==='evm'?'FULL_EVM_PUBLIC_ADDRESS_REQUIRED':'INVALID_PUBLIC_ADDRESS');
  await update(ref,secret=>{
    check(secret.status==='recovery-saved','RECOVERY_NOT_SAVED');
    secret.publicAddress=publicAddress;
    secret.chainFamily=family;
    secret.status='complete';
  });
  return {walletId:ref.id,publicAddress,chainFamily:family,addressValidation:options.validator?'provided-validator':'format-only',status:'complete',vaultPath:location(ref.root,ref.id)};
}

/** Inject only the unlock password for a trusted local adapter; never return secret values. */
export async function withWalletPasswordEnvironment(ref,action) {
  const previous=process.env.WALLET_TEST_PASSWORD;
  const secret=await decrypt(ref);
  try {
    process.env.WALLET_TEST_PASSWORD=secret.password;
    try {await action();}
    catch(error){const safe=['WALLET_LOCKED','MANUAL_PROVISIONING_REQUIRED','UNKNOWN_WALLET_HOME','STALE_WALLET_REQUEST'];throw Error(safe.includes(error.message)?error.message:'WALLET_UNLOCK_FAILED');}
  } finally {
    secret.password=null;secret.recoveryWords=null;
    if(previous===undefined)delete process.env.WALLET_TEST_PASSWORD;else process.env.WALLET_TEST_PASSWORD=previous;
  }
}
