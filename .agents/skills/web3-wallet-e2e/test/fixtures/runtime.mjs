// Synthetic runtime for CLI integration tests. No browser, keys or RPC calls.
import { appendFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function launchRegisteredWallet() {
  const root = process.env.WALLET_RUNNER_FIXTURE_ROOT;
  const scenario = JSON.parse(await readFile(resolve(root, 'scenario.json'), 'utf8'));
  const mode = process.env.WALLET_RUNNER_FIXTURE_MODE;
  const log = action => appendFile(resolve(root, 'actions.log'), `${action}\n`);
  await log('launch');
  const extension = {id:'nkbihfbeogaeaoehlefnkodbefgpgknn', version:'13.54.0', sha256:'synthetic'};
  const signature = scenario.kind.startsWith('signature-');
  const hash = signature ? '#/confirmation/fixture' : '#/confirm-transaction/fixture';
  let pending = false;
  let newPages = 0;
  const fields = {
    'advanced-details-displayed-nonce':'0', 'sender-address':scenario.expectedAccount,
    'recipient-address':scenario.expected.recipient,
    'confirmation__details-network-name':scenario.expected.network,
    'confirmation__details-origin':'example.org', 'advanced-details-data-function':scenario.expected.requestType,
    'first-gas-field':scenario.expected.fee, 'confirm-title-text':scenario.expected.requestType,
    'native-account':scenario.expectedAccount, 'native-origin':'example.org', 'native-message':scenario.expected.message,
  };
  const field = id => ({count:async () => 1, isVisible:async () => Boolean(fields[id]),
    innerText:async () => fields[id], getAttribute:async () => fields[id], waitFor:async () => {}});
  const native = {
    url:() => `chrome-extension://${extension.id}/notification.html${hash}`,
    getByTestId:id => id.startsWith('confirm-footer-') ? {
      count:async () => 1, isVisible:async () => true, isEnabled:async () => true, waitFor:async () => {},
      innerText:async () => id === 'confirm-footer-button' ? 'Confirm' : 'Reject',
      click:async () => {
        await log(id);
        if (mode === 'timeout') throw new Error('CLICK_TIMEOUT');
        pending = false;
      },
    } : field(id),
    getByRole:role => role === 'heading'
      ? {count:async () => 1, innerText:async () => scenario.expected.amount}
      : {isVisible:async () => false},
    locator:() => ({count:async () => 0}), screenshot:async () => {},
    waitForURL:async () => {}, isClosed:() => !pending,
  };
  const app = {
    url:() => scenario.url, on:() => {}, goto:async () => {}, screenshot:async () => {},
    evaluate:async () => ({accounts:[scenario.expectedAccount], chainId:scenario.chainId}),
    getByText:value => ({
      count:async () => 1,
      click:async () => { await log('trigger'); pending = true; },
      waitFor:async () => {
        if (value !== scenario.after.value) throw new Error('UNEXPECTED_APP_ASSERTION');
        if (mode === 'followup') pending = true;
      },
    }),
  };
  const home = {
    url:() => `chrome-extension://${extension.id}/home.html`, goto:async () => {}, close:async () => {},
    locator:() => ({isVisible:async () => false}), getByTestId:() => ({isVisible:async () => true}),
  };
  return {
    record:{name:'fixture', wallet:'metamask', accounts:{evm:scenario.expectedAccount}, profile:root}, extension,
    context:{
      pages:() => pending ? [native] : [], newPage:async () => newPages++ === 0 ? home : app,
      browser:() => ({version:() => 'synthetic'}), tracing:{start:async () => {}, stop:async () => {}},
    },
    close:async () => log('close'),
  };
}

export async function withPasswordEnvironment(_record, action) {
  return action();
}
