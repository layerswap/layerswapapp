import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { validateScenario, assess, appSteps, resultStatus } from '../scripts/core.mjs';
import { MetaMask } from '../scripts/metamask.mjs';
import { discover } from '../scripts/discover.mjs';

const extension = {id:'nkbihfbeogaeaoehlefnkodbefgpgknn',version:'13.54.0'};
const scenario = () => ({schemaVersion:1,id:'transfer-reject',kind:'confirmation-rejection',url:'https://example.org',
  expectedAccount:`0x${'1'.repeat(40)}`,chainId:1,connectSteps:[],prepareSteps:[],trigger:{by:'text',value:'Send'},
  expected:{requestType:'transfer',network:'Ethereum',amount:'1 ETH',recipient:`0x${'2'.repeat(40)}`},after:{by:'text',value:'Transaction rejected'}});

test('scenario rejects arbitrary code, signing actions and missing expected details',()=>{
  assert.equal(validateScenario(scenario()).id,'transfer-reject');
  for (const action of ['evaluate','sign','confirm','goto']) {
    const s=scenario();s.prepareSteps=[{action,target:{by:'css',value:'button'}}];
    assert.throws(()=>validateScenario(s),/UNSAFE_ACTION/);
  }
  const s=scenario();delete s.expected.amount;assert.throws(()=>validateScenario(s),/DETAILS_REQUIRED/);
});
test('opening a wallet cannot pass incomplete inspection',()=>{
  assert.equal(assess({},{}).status,'BLOCKED');
  assert.equal(resultStatus(['PASS','BLOCKED','PASS']),'BLOCKED');
  const e={account:'0x1',network:'Ethereum',requestType:'transfer',amount:'1 ETH',recipient:'0x2',fee:'0.01 ETH',origin:'example.org'};
  assert.equal(assess(e,e).status,'PASS');
  assert.deepEqual(assess(e,{amount:'2 ETH'}).mismatches,['amount']);
});
test('app actions stop after cross-origin navigation before any click',async()=>{
  let clicks=0;
  const page={url:()=> 'chrome-extension://wallet/confirm',locator:()=>({count:async()=>1,click:async()=>clicks++})};
  await assert.rejects(appSteps(page,[{action:'click',target:{by:'css',value:'button'}}],'https://example.org'),/ORIGIN_CHANGED/);
  assert.equal(clicks,0);
});
function walletHarness({label='Reject',hash='#/confirm-transaction/1',count=1,clickFails=false}={}) {
  const actions=[];
  let pending=true;
  const button={count:async()=>count,innerText:async()=>label,click:async()=>{actions.push(label);if(clickFails)throw Error('TIMEOUT');pending=false;}};
  const page={url:()=>`chrome-extension://${extension.id}/notification.html${hash}`,
    getByRole:()=>({isVisible:async()=>false}),getByTestId:id=>{assert.equal(id,'confirm-footer-cancel-button');return button;},
    waitForURL:async()=>{},isClosed:()=>false};
  const wallet=new MetaMask({pages:()=>pending?[page]:[]},extension,10);
  return {wallet,actions};
}
test('native rejection clicks only the audited cancel control once',async()=>{
  const {wallet,actions}=walletHarness();await wallet.reject();assert.deepEqual(actions,['Reject']);
  assert.equal(wallet.confirmTransaction,undefined);assert.equal(wallet.sign,undefined);
});
test('ambiguous labels and duplicate controls fail closed',async()=>{
  for(const config of [{label:'Confirm'},{label:'Reject and sign'},{count:2}]) {
    const {wallet,actions}=walletHarness(config);await assert.rejects(wallet.reject(),/AMBIGUOUS_REJECTION/);assert.deepEqual(actions,[]);
  }
});
test('unknown signature routes are never approved or guessed',async()=>{
  const {wallet,actions}=walletHarness({hash:'#/confirm-signature/1'});
  await assert.rejects(wallet.reject(),/UNSUPPORTED_REQUEST_UI/);assert.deepEqual(actions,[]);
});
test('a timeout never retries rejection',async()=>{
  const {wallet,actions}=walletHarness({clickFails:true});await assert.rejects(wallet.reject(),/TIMEOUT/);assert.deepEqual(actions,['Reject']);
});
test('uncalibrated extension version is unsupported',()=>{
  assert.throws(()=>new MetaMask({}, {...extension,version:'99'}),/UNSUPPORTED_WALLET_VERSION/);
});
test('portable discovery separates code candidates and ignores secrets',async()=>{
  const root=await mkdtemp(resolve(tmpdir(),'wallet-discovery-'));
  try {
    await mkdir(resolve(root,'src'));
    await writeFile(resolve(root,'package.json'),JSON.stringify({name:'unrelated-app',dependencies:{wagmi:'1'}}));
    await writeFile(resolve(root,'src/app.ts'),'const label="Connect wallet";\nconst wallet="Phantom";');
    await writeFile(resolve(root,'.env.local'),'SECRET=must-not-appear');
    const r=await discover(root);
    assert.equal(r.packages[0].name,'unrelated-app');
    assert.equal(r.codeEvidence.length,2);
    assert.ok(r.unknown.length);assert.ok(!JSON.stringify(r).includes('must-not-appear'));
  } finally {await rm(root,{recursive:true,force:true});}
});

test('native inspection retains displayed details and marks inaccessible fields null',async()=>{
  const fields={
    'confirm-footer-cancel-button':'Reject','advanced-details-displayed-nonce':'0',
    'sender-address':`0x${'1'.repeat(40)}`,'recipient-address':`0x${'2'.repeat(40)}`,
    'confirmation__details-network-name':'Arbitrum','confirmation__details-origin':'example.org',
    'advanced-details-data-function':'Function transfer','first-gas-field':'0.00001 ETH',
    'simulation-details-layout':'Estimated changes'};
  const node=id=>({isVisible:async()=>id in fields,innerText:async()=>fields[id],waitFor:async()=>{}});
  const page={url:()=>`chrome-extension://${extension.id}/notification.html#/confirm-transaction/1`,
    getByTestId:node,getByRole:(role)=>role==='heading'?{count:async()=>1,innerText:async()=>'1 USDC'}:{isVisible:async()=>false},
    locator:()=>({count:async()=>0})};
  const wallet=new MetaMask({pages:()=>[page]},extension);
  const evidence=await wallet.inspect();
  assert.equal(evidence.amount,'1 USDC');assert.equal(evidence.fee,'0.00001 ETH');
  assert.equal(evidence.recipient,`0x${'2'.repeat(40)}`);
  assert.equal(evidence.spender,null);assert.equal(evidence.calldata,null);
  assert.deepEqual(evidence.warnings,[]);
});


test('recipient inspection uses the native detail button, not the inert address row',async()=>{
  const events=[];
  const recipient='0x'+'2'.repeat(40);
  const detailButton={count:async()=>1,click:async()=>events.push('open-address')};
  const fields={'confirm-footer-cancel-button':'Cancel','advanced-details-displayed-nonce':'0','recipient-address':'0x222...222'};
  const node=id=>({isVisible:async()=>id in fields,innerText:async()=>fields[id],waitFor:async()=>{},getByRole:()=>detailButton});
  const dialog={getByRole:role=>role==='textbox'?{waitFor:async()=>{},inputValue:async()=>recipient}:{click:async()=>events.push('close-address')},waitFor:async()=>{}};
  const page={url:()=>`chrome-extension://${extension.id}/notification.html#/confirm-transaction/2`,getByTestId:node,
    getByRole:role=>role==='dialog'?dialog:role==='heading'?{count:async()=>0}:{isVisible:async()=>false},
    locator:()=>({count:async()=>0})};
  const wallet=new MetaMask({pages:()=>[page]},extension);
  const evidence=await wallet.inspect();
  assert.equal(evidence.recipient,recipient);
  assert.deepEqual(events,['open-address','close-address']);
});
