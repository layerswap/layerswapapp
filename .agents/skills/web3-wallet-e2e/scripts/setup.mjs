import { readFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { extensionIdentity, check } from './core.mjs';

// Readiness probe only. Never installs dependencies, provisions wallets or connects.
process.umask(0o077);
const file = resolve(process.argv[2]);
const base = dirname(file);
const config = JSON.parse(await readFile(file,'utf8'));
const extension = await extensionIdentity(resolve(base,config.extensionPath));
check(config.wallet === 'metamask' && extension.id === 'nkbihfbeogaeaoehlefnkodbefgpgknn','UNSUPPORTED_WALLET');
check(extension.version === config.extensionVersion && extension.sha256 === config.extensionSha256,'EXTENSION_PIN_MISMATCH');
const require = createRequire(config.playwrightPackage ? resolve(base,config.playwrightPackage) : import.meta.url);
const {chromium} = require('playwright');
const state = resolve(base,'.state');
await mkdir(state,{recursive:true,mode:0o700});
const profile = await mkdtemp(resolve(state,'reject-smoke-'));
const output = resolve(base,'artifacts',`readiness-${Date.now()}`);
await mkdir(output,{recursive:true,mode:0o700});
let context;
const result = {status:'BLOCKED',wallet:'metamask',extensionVersion:extension.version,extensionSha256:extension.sha256,
  connectionAttempted:false,authorizationActions:0};
try {
  context = await chromium.launchPersistentContext(profile,{channel:'chromium',headless:config.headless === true,
    args:[`--disable-extensions-except=${extension.path}`,`--load-extension=${extension.path}`]});
  const matches = worker => new URL(worker.url()).host === extension.id;
  if (!context.serviceWorkers().some(matches)) await context.waitForEvent('serviceworker',{predicate:matches,timeout:30000});
  result.extensionLoaded = true;
  const page = await context.newPage();
  const url = new URL(config.smokeUrl);
  check(url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1','localhost'].includes(url.hostname)), 'UNSAFE_APP_URL');
  await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:45000});
  result.appTitle = await page.title();
  result.status = 'PASS';
} catch(error) {
  result.reason = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'BROWSER_OR_NETWORK_FAILURE';
} finally {
  await context?.close();
  await writeFile(resolve(output,'readiness.json'),JSON.stringify(result,null,2),{mode:0o600});
  console.log(JSON.stringify({...result,output}));
  if (result.status !== 'PASS') process.exitCode=1;
}
