import { readFile, writeFile, mkdir, realpath, open, unlink, access } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {pathToFileURL} from 'node:url';
import { check, validateScenario, extensionIdentity, target, appSteps, assess, resultStatus } from './core.mjs';
import { MetaMask } from './metamask.mjs';
import { report } from './report.mjs';

process.umask(0o077);
const configFile = resolve(process.argv[2]);
const scenarioFile = resolve(process.argv[3]);
const base = dirname(configFile);
const config = JSON.parse(await readFile(configFile,'utf8'));
const scenario = JSON.parse(await readFile(scenarioFile,'utf8'));
const artifactDir = resolve(base,'artifacts',`${scenario.id ?? 'invalid'}-${randomUUID()}`);
// Scenario IDs are validated before being used as path components.
check(/^[a-z0-9-]+$/.test(scenario.id ?? ''), 'INVALID_SCENARIO_ID');
await mkdir(artifactDir,{recursive:true,mode:0o700});
const git = args => {try {return execFileSync('git',args,{cwd:base,stdio:['ignore','pipe','ignore']}).toString().trim();} catch {return null;}};
const result = {scenarioId:scenario.id, appUrl:scenario.url, project:config.projectRoot ?? base,
  commit:git(['rev-parse','HEAD']),branch:git(['branch','--show-current']), wallet:config.wallet,
  startedAt:new Date().toISOString(),status:'BLOCKED',expectedResult:scenario.description,
  checks:{connection:'NOT_RUN',confirmationOpened:'NOT_RUN',walletDetails:'NOT_RUN',requestRejected:'NOT_RUN',appHandledRejection:'NOT_RUN'},
  intentionalAuthorizationActions:0,broadcastVerification:'unknown; no external broadcast monitor configured',consoleErrors:[]};
let context, wallet, lock, lockPath, registeredSession, runtime, profilePath, extension, tracing = false, requested = false, rejectionAttempted = false;
try {
  validateScenario(scenario);
  check(config.wallet === 'metamask', 'UNSUPPORTED_WALLET');
  if(config.walletName){
    const controller = config.runtimeModule
      ? pathToFileURL(resolve(base, config.runtimeModule))
      : new URL('../../web3-wallet-session/scripts/runtime.mjs', import.meta.url);
    runtime = await import(controller.href);
    registeredSession=await runtime.launchRegisteredWallet(config.walletName,{headless:config.headless===true});
    check(registeredSession.record.wallet===config.wallet,'REGISTERED_WALLET_TYPE_MISMATCH');
    const expected=registeredSession.record.accounts.evm;
    check(expected?.toLowerCase()===scenario.expectedAccount.toLowerCase(),'SCENARIO_REGISTERED_ACCOUNT_MISMATCH');
    context=registeredSession.context;extension=registeredSession.extension;profilePath=registeredSession.record.profile;
    result.registeredWallet=registeredSession.record.name;
    result.browserVersion=context.browser()?.version()??'not exposed';
    result.walletVersion=extension.version;result.extensionSha256=extension.sha256;
  }else{
  extension = await extensionIdentity(resolve(base,config.extensionPath));
  result.walletVersion = extension.version;
  result.extensionSha256 = extension.sha256;
  check(extension.version === config.extensionVersion && extension.sha256 === config.extensionSha256, 'EXTENSION_PIN_MISMATCH');
  const stateRoot = resolve(base,'.state');
  const profile = resolve(base,config.profilePath);
  profilePath=profile;
  check(relative(stateRoot,profile) && !relative(stateRoot,profile).startsWith('..') && !relative(stateRoot,profile).startsWith('/'), 'ISOLATED_PROFILE_REQUIRED');
  await mkdir(profile,{recursive:true,mode:0o700});
  check((await realpath(profile)).startsWith(`${await realpath(stateRoot)}/`), 'PROFILE_SYMLINK_ESCAPE');
  await access(resolve(profile,'unresolved-request.json')).then(() => {throw new Error('UNRESOLVED_PREVIOUS_REQUEST');}, error => {if(error.code !== 'ENOENT')throw error;});
  lockPath = resolve(profile,'reject-only.lock');
  lock = await open(lockPath,'wx',0o600);
  // Reuse a project's Playwright without changing its dependencies; otherwise use this package.
  const require = createRequire(config.playwrightPackage ? resolve(base,config.playwrightPackage) : import.meta.url);
  const {chromium} = require('playwright');
  context = await chromium.launchPersistentContext(profile,{channel:'chromium',headless:config.headless === true,
    locale:'en-US',viewport:{width:1280,height:900},args:[`--disable-extensions-except=${extension.path}`,`--load-extension=${extension.path}`]});
  context.setDefaultTimeout(config.timeoutMs ?? 20000);
  result.browserVersion = context.browser()?.version() ?? 'not exposed';
  }
  wallet = new MetaMask(context,extension,config.timeoutMs ?? 20000);
  if(registeredSession)await runtime.withPasswordEnvironment(registeredSession.record,()=>wallet.ready());
  else await wallet.ready(); // no recording during provisioning/unlock
  await context.tracing.start({screenshots:false,snapshots:false,sources:false}); tracing = true;
  const page = await context.newPage();
  // Retain only counts and safe categories; raw console strings may contain secrets.
  page.on('pageerror',()=>result.consoleErrors.push({category:'uncaught-app-error',at:new Date().toISOString()}));
  page.on('console',message=>{if(message.type()==='error')result.consoleErrors.push({category:'app-console-error',at:new Date().toISOString()});});
  await page.goto(scenario.url,{waitUntil:'domcontentloaded'});
  const origin = new URL(scenario.url).origin;
  check(new URL(page.url()).origin === origin,'APP_ORIGIN_CHANGED');
  await appSteps(page,scenario.connectSteps,origin);
  if (scenario.connectSteps.length) await wallet.connect(origin);
  const state = await wallet.publicState(page);
  result.account = state.accounts.length === 1 ? state.accounts[0] : null;
  result.chainId = state.chainId;
  check(result.account?.toLowerCase() === scenario.expectedAccount.toLowerCase(),'CONNECTED_ACCOUNT_MISMATCH');
  result.checks.connection = 'PASS';
  if (scenario.kind !== 'negative') check(state.chainId === scenario.chainId,'WRONG_NETWORK');
  await appSteps(page,scenario.prepareSteps,origin);
  if (scenario.kind === 'confirmation-rejection') {
    check(new URL(page.url()).origin === origin,'APP_ORIGIN_CHANGED');
    requested = true; // includes click timeout; cleanup must still check for a pending request
    const trigger = target(page,scenario.trigger);
    check(await trigger.count() === 1,'AMBIGUOUS_APP_CONTROL');
    await trigger.click();
    const request = await wallet.request('transaction');
    result.checks.confirmationOpened = 'PASS';
    result.walletEvidence = await wallet.inspect();
    result.assessment = assess(result.walletEvidence,{...scenario.expected,account:scenario.expectedAccount,origin:new URL(origin).host});
    result.checks.walletDetails = result.assessment.status;
    result.screenshot = 'wallet-confirmation.png';
    await request.screenshot({path:resolve(artifactDir,result.screenshot),fullPage:true});
    rejectionAttempted = true;
    await wallet.reject(); requested = false;
    result.checks.requestRejected = 'PASS';
  } else {
    check(wallet.pending().length === 0,'UNEXPECTED_WALLET_REQUEST');
    result.checks.confirmationOpened = 'NOT_APPLICABLE';
    result.checks.walletDetails = 'NOT_APPLICABLE';
    result.checks.requestRejected = 'NOT_APPLICABLE';
  }
  await target(page,scenario.after).waitFor({state:'visible'});
  result.checks.appHandledRejection = 'PASS';
  await page.screenshot({path:resolve(artifactDir,'app-result.png')});
  result.status = resultStatus(Object.values(result.checks).filter(v=>v!=='NOT_APPLICABLE'));
  result.actualResult = scenario.kind === 'confirmation-rejection' ? 'Native request inspected and rejected; expected app UI observed.' : 'Expected connection or negative-case UI observed without a transaction request.';
} catch (error) {
  const code = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'BROWSER_OR_IO_FAILURE';
  result.actualResult = code;
  result.status = code.startsWith('UNSUPPORTED_') ? 'UNSUPPORTED' : 'BLOCKED';
  if (requested && wallet && !rejectionAttempted) {
    try {await wallet.reject();result.checks.requestRejected='PASS';}
    catch {result.cleanup='UNRESOLVED_REQUEST_DO_NOT_RETRY';}
  } else if (requested && rejectionAttempted) {
    result.cleanup='UNRESOLVED_REQUEST_DO_NOT_RETRY';
  }
} finally {
  if (tracing) {
    try {await context.tracing.stop({path:resolve(artifactDir,'trace.zip')}); result.trace='trace.zip';}
    catch {result.trace='unavailable';}
  }
  if(result.cleanup==='UNRESOLVED_REQUEST_DO_NOT_RETRY'&&profilePath){
    await writeFile(resolve(profilePath,'unresolved-request.json'),JSON.stringify({scenarioId:scenario.id,reason:result.cleanup}),{mode:0o600});
  }
  try {if(registeredSession)await registeredSession.close();else await context?.close();} catch {result.browserCleanup='failed';}
  if (lock) {
    await lock.close();await unlink(lockPath);
  }
  result.finishedAt = new Date().toISOString();
  await writeFile(resolve(artifactDir,'result.json'),JSON.stringify(result,null,2),{mode:0o600});
  await writeFile(resolve(artifactDir,'report.md'),report(result),{mode:0o600});
  console.log(JSON.stringify({status:result.status,reason:result.actualResult,artifactDir}));
  if (result.status !== 'PASS') process.exitCode=1;
}
