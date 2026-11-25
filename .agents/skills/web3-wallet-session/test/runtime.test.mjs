import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink,lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {verifyBrowserArguments,assertCompatibleBrowser,initialize,registerWallet,resolveWallet,acquireWallet,reserveProvisioning,launchOptions,launchRegisteredWallet,withPasswordEnvironment} from '../scripts/runtime.mjs';
const exec=promisify(execFile);
async function fixture(action){
 const dir=await mkdtemp(resolve(tmpdir(),'wallet-session-test-'));const root=resolve(dir,'runtime');await initialize(root);
 const record={name:'shared-test',wallet:'metamask',profile:resolve(root,'profiles/shared-test'),status:'ready',accounts:{evm:'0x'+'1'.repeat(40)},
 browser:{kind:'playwright-chromium',packageJson:resolve(dir,'package.json'),executable:resolve(dir,'pinned-chromium'),playwrightVersion:'1.58.2'},
 extension:{path:resolve(root,'extensions/pinned'),id:'nkbihfbeogaeaoehlefnkodbefgpgknn',version:'13.54.0',sha256:'a'.repeat(64)}};
 await mkdir(record.profile,{mode:0o700});await registerWallet(record,{root,makeDefault:true});
 try{await action({root,record,dir});}finally{await rm(dir,{recursive:true,force:true});}
}
test('named/default/type selection resolves one persistent record independent of cwd',async()=>fixture(async({root,record,dir})=>{
 assert.equal((await resolveWallet(undefined,{root})).profile,record.profile);
 assert.equal((await resolveWallet('metamask',{root})).name,record.name);
 const module=new URL('../scripts/runtime.mjs',import.meta.url).href;
 const {stdout}=await exec(process.execPath,['--input-type=module','-e',`import {resolveWallet} from ${JSON.stringify(module)};console.log((await resolveWallet(undefined,{root:${JSON.stringify(root)}})).profile));`.replace('profile));','profile);')],{cwd:dir});
 assert.equal(stdout.trim(),record.profile);
}));
test('another process is blocked instead of creating or attaching to a second profile',async()=>fixture(async({root,record})=>{
 const lease=await acquireWallet(record.name,{root});
 try{
  const module=new URL('../scripts/runtime.mjs',import.meta.url).href;
  const {stdout}=await exec(process.execPath,['--input-type=module','-e',`import {acquireWallet} from ${JSON.stringify(module)};try{await acquireWallet(${JSON.stringify(record.name)},{root:${JSON.stringify(root)}});}catch(error){console.log(error.message);}`]);
  assert.equal(stdout.trim(),'WALLET_BUSY_NO_PROFILE_FALLBACK');
 }finally{await lease.release();}
 const next=await acquireWallet(record.name,{root});await next.release();
}));
test('ambiguous types and unregistered wallets never select a fallback',async()=>fixture(async({root,record})=>{
 await assert.rejects(resolveWallet('phantom',{root}),/NOT_REGISTERED_OR_AMBIGUOUS/);
 await registerWallet({...record,name:'other',profile:resolve(root,'profiles/other')},{root});
 await assert.rejects(resolveWallet('metamask',{root}),/NOT_REGISTERED_OR_AMBIGUOUS/);
 assert.equal((await resolveWallet(undefined,{root})).name,record.name);
}));
test('personal browser paths and out-of-root profiles are refused',async()=>fixture(async({root,record,dir})=>{
 await assert.rejects(registerWallet({...record,name:'bad',profile:resolve(dir,'Library/Application Support/Google/Chrome/Default')},{root}),/MANAGED_PROFILE_REQUIRED|PERSONAL_BROWSER/);
 await assert.rejects(registerWallet({...record,name:'bad',extension:{...record.extension,path:resolve(dir,'external-extension')}},{root}),/MANAGED_EXTENSION_CODE_REQUIRED/);
}));
test('profile symlinks cannot escape into another browser',async()=>fixture(async({root,record,dir})=>{
 await rm(record.profile,{recursive:true});await mkdir(resolve(dir,'external'));await symlink(resolve(dir,'external'),record.profile);
 await assert.rejects(launchRegisteredWallet(record.name,{root}),/REGISTERED_PROFILE_UNAVAILABLE/);
 const lease=await acquireWallet(record.name,{root});await lease.release();
}));
test('missing profile stops without recreating it',async()=>fixture(async({root,record})=>{
 await rm(record.profile,{recursive:true});
 await assert.rejects(launchRegisteredWallet(record.name,{root}),/LAUNCH_FAILED_NO_FALLBACK/);
 await assert.rejects(lstat(record.profile),{code:'ENOENT'});
}));
test('browser arguments pin isolation and mock keychain without remote debugging',async()=>fixture(async({record})=>{
 const opts=launchOptions(record,{headless:false,channel:'chrome',profile:'/personal',args:['--remote-debugging-port=9222']});
 assert.equal(opts.executablePath,record.browser.executable);assert.equal(opts.channel,'chromium');
 assert.ok(opts.args.includes('--use-mock-keychain'));assert.ok(opts.args.includes('--password-store=basic'));
 assert.ok(!opts.args.some(a=>a.includes('remote-debugging')||a.includes('user-data-dir')));
}));
test('registered credential is private, scoped and redacted on callback failure',async()=>fixture(async({root,record})=>{
 const path=resolve(root,'credentials/test.env');await writeFile(path,'WALLET_TEST_PASSWORD=synthetic-private-password\n',{mode:0o600});
 record.credential={kind:'env-file',path};const previous=process.env.WALLET_TEST_PASSWORD;
 process.env.WALLET_TEST_PASSWORD='unrelated-session-value';
 try{
  await assert.rejects(withPasswordEnvironment(record,async()=>{assert.equal(process.env.WALLET_TEST_PASSWORD,'synthetic-private-password');throw Error('bad '+process.env.WALLET_TEST_PASSWORD);}),/^Error: WALLET_UNLOCK_FAILED$/);
  assert.equal(process.env.WALLET_TEST_PASSWORD,'unrelated-session-value');
 }finally{if(previous===undefined)delete process.env.WALLET_TEST_PASSWORD;else process.env.WALLET_TEST_PASSWORD=previous;}
}));
test('duplicate registration never overwrites a wallet',async()=>fixture(async({root,record})=>{
 await assert.rejects(registerWallet({...record,accounts:{evm:'0x'+'2'.repeat(40)}},{root}),/WALLET_ALREADY_REGISTERED/);
 assert.deepEqual((await resolveWallet(record.name,{root})).accounts,record.accounts);
}));
test('new wallet name reservation is exclusive and never replaces an existing wallet',async()=>fixture(async({root,record})=>{
 await assert.rejects(reserveProvisioning(record.name,{root}),/ALREADY_REGISTERED_REUSE/);
 const reservation=await reserveProvisioning('new-wallet',{root});
 await assert.rejects(reserveProvisioning('new-wallet',{root}),/WALLET_BUSY_NO_PROFILE_FALLBACK/);
 assert.equal(reservation.profile,record.profile);await reservation.release();
}));

test('the same extension cannot get a duplicate wallet identity in one profile',async()=>fixture(async({root,record})=>{
 await assert.rejects(registerWallet({...record,name:'different-alias'},{root}),/SHARED_PROFILE_DUPLICATE_EXTENSION/);
}));

test('a reported Keychain prompt blocks launches before any browser or profile access',async()=>fixture(async({root,record})=>{
 await writeFile(resolve(root,'launch-block.json'),JSON.stringify({reason:'SYSTEM_KEYCHAIN_PROMPT'}),{mode:0o600});
 await assert.rejects(launchRegisteredWallet(record.name,{root}),/SYSTEM_KEYCHAIN_PROMPT_LAUNCH_DISABLED/);
 const lease=await acquireWallet(record.name,{root});await lease.release();
}));

test('Keychain isolation flags are not removed by Playwright ignoreDefaultArgs filtering',async()=>fixture(async({record})=>{
 const options=launchOptions(record);
 assert.equal(options.ignoreDefaultArgs,undefined);
 const defaults=['--password-store=basic','--use-mock-keychain'];
 const assembled=[...defaults,...options.args];
 const effective=options.ignoreDefaultArgs?assembled.filter(arg=>!options.ignoreDefaultArgs.includes(arg)):assembled;
 assert.ok(effective.includes('--use-mock-keychain'));
 assert.ok(effective.includes('--password-store=basic'));
}));


test('profile version refuses downgrade before any browser launch', async () => fixture(async ({record}) => {
 await writeFile(resolve(record.profile, 'Last Version'), '151.0.7922.34');
 await assert.rejects(assertCompatibleBrowser(record, '145.0.7632.6'), /PROFILE_BROWSER_DOWNGRADE_FORBIDDEN/);
 await assertCompatibleBrowser(record, '151.0.7922.34');
 await assertCompatibleBrowser(record, '152.0.1.0');
 record.browser.chromiumVersion = '151.0.7922.34';
 await assert.rejects(assertCompatibleBrowser(record, '152.0.1.0'), /REGISTERED_CHROMIUM_VERSION_CHANGED/);
}));

test('recovery permit is PID scoped and consumed even when preflight fails', async () => fixture(async ({root, record}) => {
 await writeFile(resolve(root, 'launch-block.json'), '{}', {mode:0o600});
 const directory = resolve(root, 'recovery'); await mkdir(directory, {mode:0o700});
 const permit = resolve(directory, 'one-use.json');
 const data = {wallet:record.name,pid:process.pid + 1,purpose:'user-authorized-single-recovery',expiresAt:Date.now()+50000};
 await writeFile(permit, JSON.stringify(data), {mode:0o600});
 await assert.rejects(launchRegisteredWallet(record.name, {root,recoveryPermit:permit}), /INVALID_SINGLE_RECOVERY_PERMIT/);
 data.pid = process.pid; await writeFile(permit, JSON.stringify(data), {mode:0o600});
 await rm(record.profile, {recursive:true});
 await assert.rejects(launchRegisteredWallet(record.name, {root,recoveryPermit:permit}), /REGISTERED_BROWSER_LAUNCH_FAILED/);
 await assert.rejects(lstat(permit), {code:'ENOENT'});
 assert.ok((await lstat(permit + '.consumed')).isFile());
 assert.ok((await lstat(resolve(root, 'launch-block.json'))).isFile());
}));


test('own-browser command-line inspection enforces profile and Keychain flags', async () => fixture(async ({record}) => {
 const args = [...launchOptions(record).args, `--user-data-dir=${record.profile}`];
 assert.ok(args.includes('--enable-automation'));
 let detached = 0;
 const session = {async send(method) {assert.equal(method, 'Browser.getBrowserCommandLine'); return {arguments:args};}, async detach(){detached++;}};
 const context = {browser(){return {async newBrowserCDPSession(){return session;}};}};
 await verifyBrowserArguments(context, record);
 args.splice(args.indexOf('--use-mock-keychain'),1);
 await assert.rejects(verifyBrowserArguments(context, record), /BROWSER_KEYCHAIN_ISOLATION_FLAGS_MISSING/);
 session.send = async () => {throw Error('protocol failure');};
 await assert.rejects(verifyBrowserArguments(context, record), /BROWSER_ARGUMENT_INSPECTION_FAILED/);
 assert.equal(detached,3);
}));


test('chain family selects its unique wallet and never defaults to another chain', async () => fixture(async ({root,record}) => {
 await assert.rejects(resolveWallet('starknet',{root}), /NOT_REGISTERED_OR_AMBIGUOUS/);
 const starknet = {...record,name:'starknet-test',wallet:'braavos',profile:resolve(root,'profiles/starknet-test'),accounts:{starknet:'0x'+'1'.repeat(63)}};
 await registerWallet(starknet,{root});
 assert.equal((await resolveWallet('starknet',{root})).name,starknet.name);
 assert.equal((await resolveWallet('braavos',{root})).name,starknet.name);
 assert.equal((await resolveWallet(undefined,{root})).name,record.name);
 await registerWallet({...starknet,name:'second-starknet',profile:resolve(root,'profiles/second-starknet')},{root});
 await assert.rejects(resolveWallet('starknet',{root}), /NOT_REGISTERED_OR_AMBIGUOUS/);
}));

async function addMigratedWallet(root,record){
 const registryPath=resolve(root,'registry.json');
 const registry=JSON.parse(await readFile(registryPath,'utf8'));
 const peer={...record,name:'braavos-test',wallet:'braavos',accounts:{starknet:'0x123'},extension:{...record.extension,id:'jnlgamecbpmbajjfhmmmlhejkemejdma',path:resolve(root,'extensions/braavos')}};
 registry.wallets[peer.name]=peer;
 await writeFile(registryPath,JSON.stringify(registry),{mode:0o600});
 return peer;
}

test('migrated wallets share exclusive access across processes and release together',async()=>fixture(async({root,record})=>{
 const peer=await addMigratedWallet(root,record);
 const lease=await acquireWallet('starknet',{root});
 try{
  assert.equal(lease.records.length,2);
  const module=new URL('../scripts/runtime.mjs',import.meta.url).href;
  const {stdout}=await exec(process.execPath,['--input-type=module','-e',`import {acquireWallet} from ${JSON.stringify(module)};try{await acquireWallet('metamask',{root:${JSON.stringify(root)}});}catch(error){console.log(error.message);}`]);
  assert.equal(stdout.trim(),'WALLET_BUSY_NO_PROFILE_FALLBACK');
  for(const member of [record,peer])assert.ok((await lstat(resolve(root,'locks',member.name+'.lock'))).isFile());
 }finally{await lease.release();}
 const next=await acquireWallet('metamask',{root});await next.release();
}));

test('partial group acquisition releases only locks it owns',async()=>fixture(async({root,record})=>{
 const peer=await addMigratedWallet(root,record);
 const busyPath=resolve(root,'locks',record.name+'.lock');
 const owner=JSON.stringify({token:'another-owner'});await writeFile(busyPath,owner,{mode:0o600});
 await assert.rejects(acquireWallet(peer.name,{root}),/WALLET_BUSY_NO_PROFILE_FALLBACK/);
 assert.equal(await readFile(busyPath,'utf8'),owner);
 await assert.rejects(lstat(resolve(root,'locks',peer.name+'.lock')),{code:'ENOENT'});
}));

test('shared launch rejects inconsistent browser pins before opening a browser',async()=>fixture(async({root,record})=>{
 const peer=await addMigratedWallet(root,record);
 const path=resolve(root,'registry.json');const registry=JSON.parse(await readFile(path,'utf8'));
 registry.wallets[peer.name].browser={...peer.browser,playwrightVersion:'0.0.0'};
 await writeFile(path,JSON.stringify(registry),{mode:0o600});
 await assert.rejects(launchRegisteredWallet(record.name,{root}),/SHARED_PROFILE_BROWSER_PIN_MISMATCH/);
 for(const member of [record,peer])await assert.rejects(lstat(resolve(root,'locks',member.name+'.lock')),{code:'ENOENT'});
}));

test('shared browser command line must load exactly both registered extensions',async()=>fixture(async({root,record})=>{
 const peer=await addMigratedWallet(root,record);const records=[peer,record];
 const args=[...launchOptions(record,{},records).args,`--user-data-dir=${record.profile}`];
 const context={browser(){return {async newBrowserCDPSession(){return {async send(){return {arguments:args};},async detach(){}};}};}};
 await verifyBrowserArguments(context,record,records);
 args[args.findIndex(a=>a.startsWith('--load-extension='))]='--load-extension='+record.extension.path;
 await assert.rejects(verifyBrowserArguments(context,record,records),/BROWSER_EXTENSION_ARGUMENT_MISMATCH/);
}));


test('new wallets default to the existing profile and register distinct extensions together',async()=>fixture(async({root,record})=>{
 const reservation=await reserveProvisioning('new-braavos',{root});
 try{
  assert.equal(reservation.profile,record.profile);
  assert.deepEqual(reservation.browser,record.browser);
  assert.equal(reservation.records.length,1);
  await assert.rejects(acquireWallet(record.name,{root}),/WALLET_BUSY_NO_PROFILE_FALLBACK/);
  const peer={...record,name:reservation.name,wallet:'braavos',profile:reservation.profile,extension:{...record.extension,id:'jnlgamecbpmbajjfhmmmlhejkemejdma',path:resolve(root,'extensions/braavos')},accounts:{starknet:'0x123'}};
  await registerWallet(peer,{root});
  await assert.rejects(acquireWallet(peer.name,{root}),/WALLET_BUSY_NO_PROFILE_FALLBACK/);
 }finally{await reservation.release();}
 const next=await acquireWallet('braavos',{root});
 assert.equal(next.records.length,2);await next.release();
 const registry=JSON.parse(await readFile(resolve(root,'registry.json'),'utf8'));
 assert.equal(registry.defaultProfile,record.profile);
 assert.equal(registry.defaultWallet,record.name);
}));

test('clean or partial profiles require a reason and never replace the shared default',async()=>fixture(async({root,record})=>{
 await assert.rejects(reserveProvisioning('clean',{root,profileMode:'isolated'}),/ISOLATED_PROFILE_REASON_REQUIRED/);
 const isolated=await reserveProvisioning('clean',{root,profileMode:'isolated',reason:'Verify the wallet-absent picker'});
 assert.equal(isolated.profile,resolve(root,'profiles/clean'));assert.equal(isolated.profileMode,'isolated');assert.deepEqual(isolated.browser,record.browser);
 const shared=await reserveProvisioning('another-extension',{root});
 assert.equal(shared.profile,record.profile);
 await shared.release();await isolated.release();
}));

test('first shared profile reservation persists across interruptions and different wallet names',async()=>{
 const directory=await mkdtemp(resolve(tmpdir(),'wallet-first-shared-'));const root=resolve(directory,'runtime');
 try{
  const first=await reserveProvisioning('first-wallet',{root});
  assert.equal(first.profile,resolve(root,'profiles/shared-test'));await first.release();
  const second=await reserveProvisioning('second-wallet',{root});assert.equal(second.profile,first.profile);await second.release();
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('another process cannot provision into an owned shared profile or allocate a fallback',async()=>fixture(async({root,record})=>{
 const lease=await acquireWallet(record.name,{root});
 const module=new URL('../scripts/runtime.mjs',import.meta.url).href;
 try{
  const {stdout}=await exec(process.execPath,['--input-type=module','-e',`import {reserveProvisioning} from ${JSON.stringify(module)};try{await reserveProvisioning('new-extension',{root:${JSON.stringify(root)}});}catch(error){console.log(error.message);}`]);
  assert.equal(stdout.trim(),'WALLET_BUSY_NO_PROFILE_FALLBACK');
  await assert.rejects(lstat(resolve(root,'profiles/new-extension')),{code:'ENOENT'});
 }finally{await lease.release();}
}));

test('shared registration rejects incompatible pins without modifying existing wallets',async()=>fixture(async({root,record})=>{
 const candidate={...record,name:'new-braavos',extension:{...record.extension,id:'jnlgamecbpmbajjfhmmmlhejkemejdma'},browser:{...record.browser,playwrightVersion:'0.0.0'}};
 await assert.rejects(registerWallet(candidate,{root}),/SHARED_PROFILE_BROWSER_PIN_MISMATCH/);
 const registry=JSON.parse(await readFile(resolve(root,'registry.json'),'utf8'));assert.deepEqual(Object.keys(registry.wallets),[record.name]);
}));


test('provisioning never recreates a missing registered shared profile',async()=>fixture(async({root,record})=>{
 await rm(record.profile,{recursive:true});
 await assert.rejects(reserveProvisioning('new-extension',{root}),/REGISTERED_PROFILE_UNAVAILABLE/);
 await assert.rejects(lstat(record.profile),{code:'ENOENT'});
}));

test('a first isolated scenario does not become the later shared environment',async()=>{
 const directory=await mkdtemp(resolve(tmpdir(),'wallet-isolated-first-'));const root=resolve(directory,'runtime');
 try{
  const clean=await reserveProvisioning('clean-scenario',{root,profileMode:'isolated',reason:'Test clean onboarding'});await clean.release();
  const shared=await reserveProvisioning('normal-wallet',{root});
  assert.equal(shared.profile,resolve(root,'profiles/shared-test'));assert.notEqual(shared.profile,clean.profile);await shared.release();
 }finally{await rm(directory,{recursive:true,force:true});}
});
