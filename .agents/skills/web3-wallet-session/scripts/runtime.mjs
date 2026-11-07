import {homedir} from 'node:os';
import {resolve,relative,dirname,isAbsolute} from 'node:path';
import {readFile,readdir,realpath,mkdir,lstat,open,rename,unlink} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {parseEnv} from 'node:util';

export const defaultRoot=resolve(homedir(),'.codex/wallet-runtime');
function check(ok,code){if(!ok)throw Error(code);}
function within(parent,child){const part=relative(parent,child);return part!==''&&!part.startsWith('..')&&!isAbsolute(part);}
function notPersonal(path){
  check(!/Library\/Application Support\/(?:Google\/Chrome|Chromium|BraveSoftware|Microsoft Edge)(?:\/|$)|\.config\/(?:google-chrome|chromium|BraveSoftware|microsoft-edge)(?:\/|$)/i.test(path),'PERSONAL_BROWSER_PATH_FORBIDDEN');
}
async function privateDir(path){
  await mkdir(path,{recursive:true,mode:0o700});
  const stat=await lstat(path);check(stat.isDirectory()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0,'PRIVATE_RUNTIME_DIRECTORY_REQUIRED');
}
async function checkStructure(root){
  notPersonal(root);notPersonal(await realpath(root));
  for(const path of [root,...['profiles','extensions','credentials','locks'].map(part=>resolve(root,part))]){
    const stat=await lstat(path);check(stat.isDirectory()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0,'PRIVATE_RUNTIME_DIRECTORY_REQUIRED');
  }
}
async function privateJson(path){
  const stat=await lstat(path);check(stat.isFile()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0,'PRIVATE_RECORD_REQUIRED');
  return JSON.parse(await readFile(path,'utf8'));
}
async function exists(path){try{await lstat(path);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
function validateRecord(record,root){
  check(/^[a-z0-9][a-z0-9-]{0,63}$/.test(record.name),'INVALID_WALLET_NAME');
  check(isAbsolute(record.profile)&&within(resolve(root,'profiles'),resolve(record.profile)),'REGISTERED_MANAGED_PROFILE_REQUIRED');
  notPersonal(record.profile);notPersonal(root);
  check(record.browser?.kind==='playwright-chromium'&&isAbsolute(record.browser.packageJson)&&isAbsolute(record.browser.executable)&&record.browser.playwrightVersion,'PINNED_PLAYWRIGHT_BROWSER_REQUIRED');
  check(isAbsolute(record.extension?.path)&&within(resolve(root,'extensions'),resolve(record.extension.path)),'MANAGED_EXTENSION_CODE_REQUIRED');
  check(/^[a-p]{32}$/.test(record.extension.id)&&/^[a-f0-9]{64}$/.test(record.extension.sha256)&&record.extension.version,'PINNED_EXTENSION_REQUIRED');
  check(record.accounts&&Object.keys(record.accounts).length,'REGISTERED_PUBLIC_ACCOUNT_REQUIRED');
}
export async function extensionIdentity(directory){
  const path=await realpath(directory);const manifest=JSON.parse(await readFile(resolve(path,'manifest.json'),'utf8'));
  check(manifest.manifest_version===3&&manifest.key,'UNSUPPORTED_EXTENSION_MANIFEST');
  const bytes=createHash('sha256').update(Buffer.from(manifest.key,'base64')).digest().subarray(0,16);
  const id=[...bytes].flatMap(b=>[b>>4,b&15]).map(n=>String.fromCharCode(97+n)).join('');
  const hash=createHash('sha256');
  async function walk(dir){for(const entry of(await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    if(entry.name==='_metadata')continue;check(!entry.isSymbolicLink(),'EXTENSION_SYMLINK');const file=resolve(dir,entry.name);
    if(entry.isDirectory())await walk(file);else{hash.update(relative(path,file));hash.update('\0');hash.update(await readFile(file));hash.update('\0');}
  }}
  await walk(path);return{path,id,version:manifest.version_name??manifest.version,sha256:hash.digest('hex')};
}
export async function initialize(root=defaultRoot){
  root=resolve(root);notPersonal(root);await privateDir(root);
  for(const part of['profiles','extensions','credentials','locks'])await privateDir(resolve(root,part));
  const path=resolve(root,'registry.json');
  if(!await exists(path)){try{const file=await open(path,'wx',0o600);try{await file.writeFile(JSON.stringify({schemaVersion:1,defaultWallet:null,wallets:{}},null,2));await file.sync();}finally{await file.close();}}catch(error){if(error.code!=='EEXIST')throw error;}}
  return root;
}
function profileLockPath(root, profile) {
  const digest = createHash('sha256').update(resolve(profile)).digest('hex');
  return resolve(root, 'locks', `_profile-${digest}.lock`);
}
async function acquireLock(path, metadata) {
  let file;
  try { file = await open(path, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') throw Error('WALLET_BUSY_NO_PROFILE_FALLBACK'); throw error; }
  const token = randomUUID();
  try { await file.writeFile(JSON.stringify({...metadata, pid:process.pid, token})); await file.sync(); }
  catch (error) { await file.close(); await unlink(path); throw error; }
  let released = false;
  return {async release() {
    if (released) return;
    const owner = await privateJson(path);
    check(owner.token === token, 'WALLET_LOCK_OWNER_CHANGED');
    await file.close(); await unlink(path); released = true;
  }};
}
async function acquireProfile(profile, records, root, requestedWallet, extraName) {
  const held = [];
  async function release() {
    while (held.length) { await held[held.length - 1].release(); held.pop(); }
  }
  try {
    held.push(await acquireLock(profileLockPath(root, profile), {profile, requestedWallet}));
    const names = [...new Set([...records.map(member => member.name), ...(extraName ? [extraName] : [])])].sort();
    for (const name of names) held.push(await acquireLock(resolve(root, 'locks', name + '.lock'), {wallet:name, requestedWallet, profile}));
  } catch (error) { await release(); throw error; }
  return {release};
}
export async function registerWallet(record,{root=defaultRoot,makeDefault=false}={}){
  root=await initialize(root);validateRecord(record,root);
  const lock=await open(resolve(root,'locks/registry.lock'),'wx',0o600);
  const path=resolve(root,'registry.json');const temporary=path+'.'+randomUUID()+'.tmp';
  let profileLease;
  try{
    const registry=await privateJson(path);check(!registry.wallets[record.name],'WALLET_ALREADY_REGISTERED');
    const members=Object.values(registry.wallets).filter(member=>resolve(member.profile)===resolve(record.profile));
    check(!members.some(member=>member.extension.id===record.extension.id),'SHARED_PROFILE_DUPLICATE_EXTENSION');
    check(members.every(member=>['kind','packageJson','executable','playwrightVersion','chromiumVersion'].every(key=>member.browser[key]===record.browser[key])),'SHARED_PROFILE_BROWSER_PIN_MISMATCH');
    const profileLock=profileLockPath(root,record.profile);
    if(await exists(profileLock))check((await privateJson(profileLock)).pid===process.pid,'WALLET_BUSY_NO_PROFILE_FALLBACK');
    else profileLease=await acquireProfile(record.profile,members,root,record.name,record.name);
    registry.wallets[record.name]=record;if(makeDefault)registry.defaultWallet=record.name;
    const file=await open(temporary,'wx',0o600);try{await file.writeFile(JSON.stringify(registry,null,2));await file.sync();}finally{await file.close();}
    await rename(temporary,path);
  }finally{await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});await profileLease?.release();await lock.close();await unlink(resolve(root,'locks/registry.lock'));}
  return {name:record.name,profile:record.profile,accounts:record.accounts};
}
export async function resolveWallet(name,{root=defaultRoot}={}){
  root=resolve(root);await checkStructure(root);
  const registry=await privateJson(resolve(root,'registry.json'));check(registry.schemaVersion===1,'UNSUPPORTED_REGISTRY');
  let key=name??registry.defaultWallet;
  if(key&&!registry.wallets[key]){
    const matches=Object.values(registry.wallets).filter(w=>w.wallet===key||Object.hasOwn(w.accounts,key));
    check(matches.length===1,'WALLET_NOT_REGISTERED_OR_AMBIGUOUS');key=matches[0].name;
  }
  const record=registry.wallets[key];check(record,'WALLET_NOT_REGISTERED');validateRecord(record,root);
  return record;
}
export async function acquireWallet(name,{root=defaultRoot}={}){
  root=resolve(root);const record=await resolveWallet(name,{root});
  const registry=await privateJson(resolve(root,'registry.json'));
  const records=Object.values(registry.wallets).filter(member=>resolve(member.profile)===resolve(record.profile)).sort((a,b)=>a.name.localeCompare(b.name));
  for(const member of records)validateRecord(member,root);
  const lease=await acquireProfile(record.profile,records,root,record.name);
  try {
    const currentRegistry=await privateJson(resolve(root,'registry.json'));
    const currentRecords=Object.values(currentRegistry.wallets).filter(member=>resolve(member.profile)===resolve(record.profile)).sort((a,b)=>a.name.localeCompare(b.name));
    check(JSON.stringify(currentRecords)===JSON.stringify(records),'PROFILE_REGISTRY_CHANGED_RETRY');
  }catch(error){await lease.release();throw error;}
  return {record,records,release:lease.release};
}
export async function reserveProvisioning(name,{root=defaultRoot,profileMode='shared',reason}={}){
  root=await initialize(root);check(/^[a-z0-9][a-z0-9-]{0,63}$/.test(name),'INVALID_WALLET_NAME');
  check(['shared','isolated'].includes(profileMode),'INVALID_PROFILE_MODE');
  if(profileMode==='isolated')check(typeof reason==='string'&&reason.trim(),'ISOLATED_PROFILE_REASON_REQUIRED');
  const registryLock=await open(resolve(root,'locks/registry.lock'),'wx',0o600);
  let lease;
  try{
    const path=resolve(root,'registry.json');const registry=await privateJson(path);
    check(!registry.wallets[name],'WALLET_ALREADY_REGISTERED_REUSE_EXISTING');
    const originalDefaultProfile=registry.defaultProfile;
    if(profileMode==='isolated'&&!registry.defaultProfile&&!Object.keys(registry.wallets).length)registry.defaultProfile=resolve(root,'profiles','shared-test');
    let profile;
    if(profileMode==='isolated')profile=resolve(root,'profiles',name);
    else {
      profile=registry.defaultProfile??registry.wallets[registry.defaultWallet]?.profile;
      if(!profile){
        const profiles=[...new Set(Object.values(registry.wallets).map(member=>member.profile))];
        check(profiles.length<=1,'SHARED_PROFILE_AMBIGUOUS');
        profile=profiles[0]??resolve(root,'profiles','shared-test');
      }
    }
    check(isAbsolute(profile)&&within(resolve(root,'profiles'),resolve(profile)),'REGISTERED_MANAGED_PROFILE_REQUIRED');
    notPersonal(profile);
    if(await exists(profile)){
      const stat=await lstat(profile);check(stat.isDirectory()&&!stat.isSymbolicLink(),'REGISTERED_PROFILE_UNAVAILABLE');
      check(within(await realpath(resolve(root,'profiles')),await realpath(profile)),'PROFILE_SYMLINK_ESCAPE');
      for(const marker of ['unresolved-request.json','runner.lock','reject-only.lock','SingletonLock'])check(!await exists(resolve(profile,marker)),'WALLET_PROFILE_BUSY_OR_UNRESOLVED');
    }
    const records=Object.values(registry.wallets).filter(member=>resolve(member.profile)===resolve(profile));
    if(records.length)check(await exists(profile),'REGISTERED_PROFILE_UNAVAILABLE');
    lease=await acquireProfile(profile,records,root,name,name);
    if(profileMode==='shared'&&!registry.defaultProfile)registry.defaultProfile=profile;
    if(registry.defaultProfile!==originalDefaultProfile){
      const temporary=path+'.'+randomUUID()+'.tmp';
      try{const file=await open(temporary,'wx',0o600);try{await file.writeFile(JSON.stringify(registry,null,2));await file.sync();}finally{await file.close();}await rename(temporary,path);}
      finally{await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
    }
    return {name,profile,profileMode,reason:profileMode==='isolated'?reason.trim():undefined,records,browser:records[0]?.browser??registry.wallets[registry.defaultWallet]?.browser,release:lease.release};
  }catch(error){await lease?.release();throw error;}
  finally{await registryLock.close();await unlink(resolve(root,'locks/registry.lock'));}
}
export async function assertCompatibleBrowser(record, chromiumVersion) {
  check(/^\d+\.\d+\.\d+\.\d+$/.test(chromiumVersion), 'UNKNOWN_CHROMIUM_VERSION');
  if (record.browser.chromiumVersion) {
    check(record.browser.chromiumVersion === chromiumVersion, 'REGISTERED_CHROMIUM_VERSION_CHANGED');
  }
  // Chrome updates this on startup. Opening a newer profile with an older browser
  // can trap in WebAppDatabase migration before the wallet UI even opens.
  let lastVersion;
  try { lastVersion = (await readFile(resolve(record.profile, 'Last Version'), 'utf8')).trim(); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (lastVersion) {
    check(/^\d+\.\d+\.\d+\.\d+$/.test(lastVersion), 'UNKNOWN_PROFILE_BROWSER_VERSION');
    const previous = lastVersion.split('.').map(Number);
    const current = chromiumVersion.split('.').map(Number);
    const difference = current.map((part, index) => part - previous[index]).find(part => part !== 0) ?? 0;
    check(difference >= 0, 'PROFILE_BROWSER_DOWNGRADE_FORBIDDEN');
  }
}
export function launchOptions(record,{headless=false}={},records=[record]){
  const extensionPaths=records.map(member=>member.extension.path).join(',');
  return {executablePath:record.browser.executable,channel:'chromium',headless,locale:'en-US',viewport:{width:1280,height:900},
    args:['--enable-automation','--password-store=basic','--use-mock-keychain',`--disable-extensions-except=${extensionPaths}`,`--load-extension=${extensionPaths}`]};
}
export async function verifyBrowserArguments(context, record, records=[record]) {
  const inspector = await context.browser().newBrowserCDPSession();
  let actualArguments;
  try {
    ({arguments: actualArguments} = await inspector.send('Browser.getBrowserCommandLine'));
  } catch {
    throw Error('BROWSER_ARGUMENT_INSPECTION_FAILED');
  } finally {
    await inspector.detach();
  }
  check(actualArguments.includes('--enable-automation') && actualArguments.includes('--use-mock-keychain') && actualArguments.includes('--password-store=basic'), 'BROWSER_KEYCHAIN_ISOLATION_FLAGS_MISSING');
  check(actualArguments.includes(`--user-data-dir=${record.profile}`), 'BROWSER_PROFILE_ARGUMENT_MISMATCH');
  const extensionPaths=records.map(member=>member.extension.path).join(',');
  check(actualArguments.includes(`--load-extension=${extensionPaths}`)&&actualArguments.includes(`--disable-extensions-except=${extensionPaths}`),'BROWSER_EXTENSION_ARGUMENT_MISMATCH');
}
export async function launchRegisteredWallet(name,{root=defaultRoot,headless=false,recoveryPermit}={}){
  root=resolve(root);
  if(await exists(resolve(root,'launch-block.json'))){
    check(recoveryPermit&&within(resolve(root,'recovery'),resolve(recoveryPermit)),'SYSTEM_KEYCHAIN_PROMPT_LAUNCH_DISABLED');
    const permit=await privateJson(resolve(recoveryPermit));
    check(permit.wallet===name&&permit.pid===process.pid&&permit.purpose==='user-authorized-single-recovery'&&Number.isFinite(permit.expiresAt)&&permit.expiresAt>Date.now()&&permit.expiresAt<=Date.now()+60000,'INVALID_SINGLE_RECOVERY_PERMIT');
    // Consumed before launch; failures never automatically repeat a browser attempt.
    await rename(resolve(recoveryPermit),resolve(recoveryPermit)+'.consumed');
  }
  const lease=await acquireWallet(name,{root});const {record,records}=lease;let context;
  try{
    check(records.every(member=>member.status==='ready'),'WALLET_NOT_READY');
    check(records.every(member=>['kind','packageJson','executable','playwrightVersion','chromiumVersion'].every(key=>member.browser[key]===record.browser[key])),'SHARED_PROFILE_BROWSER_PIN_MISMATCH');
    check(new Set(records.map(member=>member.extension.id)).size===records.length,'SHARED_PROFILE_DUPLICATE_EXTENSION');
    // Missing profile must block, never become a fresh wallet through mkdir/launch defaults.
    const profileStat=await lstat(record.profile);check(profileStat.isDirectory()&&!profileStat.isSymbolicLink(),'REGISTERED_PROFILE_UNAVAILABLE');
    check(within(await realpath(resolve(root,'profiles')),await realpath(record.profile)),'PROFILE_SYMLINK_ESCAPE');
    for(const marker of['unresolved-request.json','runner.lock','reject-only.lock','SingletonLock'])check(!await exists(resolve(record.profile,marker)),'WALLET_PROFILE_BUSY_OR_UNRESOLVED');
    const wallets={};
    for(const member of records){
      const extension=await extensionIdentity(member.extension.path);
      check(within(await realpath(resolve(root,'extensions')),extension.path),'EXTENSION_SYMLINK_ESCAPE');
      check(extension.id===member.extension.id&&extension.version===member.extension.version&&extension.sha256===member.extension.sha256,'REGISTERED_EXTENSION_PIN_MISMATCH');
      wallets[member.name]={record:member,extension};
    }
    const {extension}=wallets[record.name];
    const require=createRequire(record.browser.packageJson);const {chromium}=require('playwright');
    check(require('playwright/package.json').version===record.browser.playwrightVersion,'REGISTERED_PLAYWRIGHT_VERSION_CHANGED');
    const coreRequire = createRequire(require.resolve('playwright/package.json'));
    const coreRoot = dirname(coreRequire.resolve('playwright-core/package.json'));
    const browserMetadata = JSON.parse(await readFile(resolve(coreRoot, 'browsers.json'), 'utf8'));
    await assertCompatibleBrowser(record, browserMetadata.browsers.find(browser => browser.name === 'chromium')?.browserVersion ?? '');
    check(await realpath(chromium.executablePath())===await realpath(record.browser.executable),'REGISTERED_BROWSER_BINARY_CHANGED');
    context=await chromium.launchPersistentContext(record.profile,launchOptions(record,{headless},records));
    context.setDefaultTimeout(20000);
    // Inspect only our own launched browser, never attach to another session.
    await verifyBrowserArguments(context, record, records);
    for(const member of records){
      const matches=worker=>new URL(worker.url()).host===member.extension.id;
      if(!context.serviceWorkers().some(matches))await context.waitForEvent('serviceworker',{predicate:matches,timeout:30000});
    }
    let closed=false;
    return {context,record,extension,wallets,async close(){if(closed)return;await context.close();await lease.release();closed=true;}};
  }catch(error){if(context){try{await context.close();}catch{throw Error('BROWSER_CLOSE_UNCERTAIN_LOCK_RETAINED');}}
    await lease.release();
    throw new Error(/^[A-Z][A-Z0-9_]+$/.test(error.message)?error.message:'REGISTERED_BROWSER_LAUNCH_FAILED_NO_FALLBACK',{cause:error});
  }
}
export async function withPasswordEnvironment(record,action){
  const variable='WALLET_TEST_PASSWORD';const prior=process.env[variable];delete process.env[variable];
  try{
    if(record.credential?.kind==='env-file'){
      const path=record.credential.path;const stat=await lstat(path);
      check(stat.isFile()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0,'PRIVATE_WALLET_CREDENTIAL_REQUIRED');
      const password=parseEnv(await readFile(path,'utf8'))[record.credential.variable??variable];
      check(password,'REGISTERED_WALLET_PASSWORD_UNAVAILABLE');process.env[variable]=password;
      try{await action();}catch(error){const safe=['WALLET_LOCKED','MANUAL_PROVISIONING_REQUIRED','UNKNOWN_WALLET_HOME','STALE_WALLET_REQUEST'];throw Error(safe.includes(error.message)?error.message:'WALLET_UNLOCK_FAILED');}
    }else if(record.credential?.kind==='vault'){
      const {withWalletPasswordEnvironment}=await import(pathToFileURL(record.credential.modulePath).href);
      await withWalletPasswordEnvironment(record.credential.reference,action);
    }else{await action();}
  }finally{if(prior===undefined)delete process.env[variable];else process.env[variable]=prior;}
}
export async function listWallets({root=defaultRoot}={}){
  root=resolve(root);const registry=await privateJson(resolve(root,'registry.json'));
  return {defaultWallet:registry.defaultWallet,browserLaunchBlocked:await exists(resolve(root,'launch-block.json')),wallets:await Promise.all(Object.values(registry.wallets).map(async w=>({name:w.name,wallet:w.wallet,profile:w.profile,accounts:w.accounts,status:w.status,busy:await exists(resolve(root,'locks',w.name+'.lock')),credentialKind:w.credential?.kind??'none'})))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const [command,name]=process.argv.slice(2);
    if(command==='list')console.log(JSON.stringify(await listWallets(),null,2));
    else if(command==='show'){const r=await resolveWallet(name);console.log(JSON.stringify({name:r.name,wallet:r.wallet,profile:r.profile,accounts:r.accounts,browser:r.browser,extension:r.extension},null,2));}
    else if(command==='open'){
      const session=await launchRegisteredWallet(name);console.log(JSON.stringify({opened:session.record.name,profile:session.record.profile,note:'Recording is off. Use only this dedicated browser; do not approve transactions.'}));
      await new Promise(done=>session.context.once('close',done));await session.close();
    }else throw Error('USAGE_LIST_SHOW_OPEN_OPTIONAL_WALLET_NAME');
  }catch(error){console.error(JSON.stringify({status:'BLOCKED',code:/^[A-Z][A-Z0-9_]+$/.test(error.message)?error.message:'RUNTIME_FAILURE_NO_PROFILE_FALLBACK'}));process.exitCode=1;}
}
