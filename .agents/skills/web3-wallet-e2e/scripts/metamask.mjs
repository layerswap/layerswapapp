import { assess, check, nativeFieldNames, sleep, target } from './core.mjs';

/** Native wallet controls; approvals require explicit scope and matching native evidence. */
export class MetaMask {
  constructor(context, extension, timeout = 20000) {
    check(extension.id === 'nkbihfbeogaeaoehlefnkodbefgpgknn' && extension.version === '13.54.0', 'UNSUPPORTED_WALLET_VERSION');
    this.context = context;
    this.extension = extension;
    this.origin = `chrome-extension://${extension.id}/`;
    this.timeout = timeout;
  }
  pending() {
    return this.context.pages().filter(p => p.url().startsWith(this.origin) && /#\/(connect|confirm)/.test(p.url()));
  }
  async ready() {
    check(this.pending().length === 0, 'STALE_WALLET_REQUEST');
    const home = await this.context.newPage();
    await home.goto(`${this.origin}home.html`, {waitUntil:'domcontentloaded'});
    const deadline = Date.now() + this.timeout;
    while (Date.now() < deadline) {
      if (/onboarding/.test(home.url())) throw new Error('MANUAL_PROVISIONING_REQUIRED');
      const password = home.locator('input[type=password]');
      if (await password.isVisible()) {
        check(process.env.WALLET_TEST_PASSWORD, 'WALLET_LOCKED');
        await password.fill(process.env.WALLET_TEST_PASSWORD);
        await home.getByRole('button',{name:'Unlock',exact:true}).click();
        await password.waitFor({state:'hidden'});
      }
      if (await home.getByTestId('account-menu-icon').isVisible()) {
        await home.close();
        return;
      }
      await sleep(100);
    }
    throw new Error('UNKNOWN_WALLET_HOME');
  }
  async request(kind) {
    check(['connection', 'transaction', 'signature'].includes(kind), 'UNSUPPORTED_REQUEST_KIND');
    const deadline = Date.now() + this.timeout;
    while (Date.now() < deadline) {
      const pages = this.pending();
      check(pages.length <= 1, 'MULTIPLE_PENDING_REQUESTS');
      if (pages.length) {
        const hash = new URL(pages[0].url()).hash;
        const route = kind === 'connection'
          ? /^#\/connect\//
          : kind === 'signature'
            ? /^#\/confirmation(?:\/[^/?]+)?(?:\?.*)?$/
            : /^#\/(?:confirm-transaction\/[^/?]+|confirmation(?:\/[^/?]+)?)(?:\?.*)?$/;
        check(route.test(hash), 'UNSUPPORTED_REQUEST_UI');
        return pages[0];
      }
      await sleep(100);
    }
    throw new Error('WALLET_REQUEST_TIMEOUT');
  }
  async connect(origin) {
    const page = await this.request('connection');
    await page.getByText(new URL(origin).hostname,{exact:true}).first().waitFor();
    // This control is valid only on the audited connection route, never a confirmation route.
    const button = page.getByRole('button',{name:'Connect',exact:true});
    check(await button.count() === 1, 'AMBIGUOUS_CONNECTION');
    await button.click();
    await page.waitForURL(url => !url.hash.startsWith('#/connect/'));
  }
  async publicState(page) {
    return page.evaluate(async () => {
      const found = [];
      const listener = event => found.push(event.detail);
      window.addEventListener('eip6963:announceProvider',listener);
      window.dispatchEvent(new Event('eip6963:requestProvider'));
      await new Promise(done => setTimeout(done,100));
      window.removeEventListener('eip6963:announceProvider',listener);
      const matches = found.filter(p => p.info.rdns === 'io.metamask');
      if (matches.length !== 1) throw new Error('AMBIGUOUS_PROVIDER');
      const provider = matches[0].provider;
      return {accounts:await provider.request({method:'eth_accounts'}), chainId:Number(BigInt(await provider.request({method:'eth_chainId'})))};
    });
  }
  async inspect(kind = 'transaction', nativeFields = {}) {
    const page = await this.request(kind);
    const requestId = new URL(page.url()).hash;
    const evidence = kind === 'signature'
      ? {requestId, requestType:await page.getByTestId('confirm-title-text').innerText()}
      : await this.inspectTransaction();
    // Signature content varies between personal_sign, SIWE, typed data and permits.
    // These read-only selectors must come from the installed native UI, not dapp inputs.
    for (const [key, field] of Object.entries(nativeFields)) {
      check(nativeFieldNames.includes(key), 'INVALID_NATIVE_FIELD');
      const node = target(page, field);
      if (await node.count() !== 1 || !await node.isVisible()) {
        evidence[key] = null;
        continue;
      }
      evidence[key] = field.attribute
        ? await node.getAttribute(field.attribute)
        : await node.innerText();
    }
    check(new URL(page.url()).hash === requestId, 'REQUEST_CHANGED');
    return evidence;
  }
  async inspectTransaction() {
    const page = await this.request('transaction');
    await page.getByTestId('confirm-footer-cancel-button').waitFor();
    check(!await page.getByRole('button',{name:'Reject all',exact:true}).isVisible(), 'MULTIPLE_PENDING_REQUESTS');
    const text = async id => await page.getByTestId(id).isVisible() ? (await page.getByTestId(id).innerText()).replace(/\s+/g,' ').trim() : null;
    if (!await page.getByTestId('advanced-details-displayed-nonce').isVisible()) {
      const advanced = page.getByTestId('header-advanced-details-button');
      if (await advanced.isVisible()) await advanced.click();
    }
    const address = async id => {
      const row = page.getByTestId(id);
      if (!await row.isVisible()) return null;
      const rendered = await row.innerText();
      const full = rendered.match(/0x[0-9a-f]{40}/i)?.[0];
      if (full) return full;
      // Only the audited address detail control may open this read-only modal.
      if (id !== 'recipient-address') return null;
      const detailButton = row.getByRole('button');
      if (await detailButton.count() !== 1) return null;
      await detailButton.click();
      const dialog = page.getByRole('dialog');
      const input = dialog.getByRole('textbox',{name:'Address',exact:true});
      await input.waitFor();
      const value = await input.inputValue();
      await dialog.getByRole('button',{name:'Close',exact:true}).click();
      await dialog.waitFor({state:'hidden'});
      return /^0x[0-9a-f]{40}$/i.test(value) ? value : null;
    };
    const warnings = [];
    const alerts = page.locator('[data-testid="confirm-banner-alert"], [data-testid="inline-alert"], [role="alert"]');
    for (let i=0;i<await alerts.count();i++) {
      if (await alerts.nth(i).isVisible()) warnings.push(await alerts.nth(i).innerText());
    }
    const heading = page.getByRole('heading',{level:2});
    return {requestId:new URL(page.url()).hash, account:await address('sender-address'),
      network:await text('confirmation__details-network-name'), origin:await text('confirmation__details-origin'),
      requestType:await text('advanced-details-data-function'),
      amount:await heading.count() === 1 ? await heading.innerText() : null,
      recipient:await address('recipient-address'), spender:await text('confirmation__approve-spender'),
      token:await text('selected-gas-fee-token'), fee:await text('first-gas-field'),
      maximumFee:await text('gas-fee-details-max-fee'), calldata:await text('advanced-details-transaction-hex'),
      decoded:await text('advanced-details-transfer-params'), simulation:await text('simulation-details-layout'), warnings,
      missingDetailPolicy:'Null means inaccessible; never substitute dapp input for native wallet evidence.'};
  }
  async approve({kind = 'transaction', expected, nativeFields = {}, requestId, authorized = false, onAttempt = () => {}}) {
    check(authorized === true, 'USER_AUTHORIZATION_REQUIRED');
    check(expected?.account && expected?.origin, 'AUTHORIZATION_SCOPE_REQUIRED');
    const required = kind === 'signature' ? ['requestType', 'message'] : ['network', 'requestType', 'amount', 'recipient', 'fee'];
    check(required.every(key => typeof expected[key] === 'string' && expected[key].length > 0), 'AUTHORIZATION_SCOPE_REQUIRED');
    // Re-read immediately before acting; a prior screenshot is not an approval check.
    const evidence = await this.inspect(kind, nativeFields);
    check(requestId && evidence.requestId === requestId, 'REQUEST_CHANGED');
    const assessment = assess(evidence, expected, kind);
    if (assessment.status !== 'PASS') {
      const error = new Error(assessment.status === 'FAIL' ? 'REQUEST_DETAILS_MISMATCH' : 'REQUEST_DETAILS_INACCESSIBLE');
      error.evidence = evidence;
      error.assessment = assessment;
      throw error;
    }
    await this.finish(kind, requestId, 'confirm-footer-button', /^(Confirm|Sign|Approve)$/, onAttempt);
    return evidence;
  }
  async sign(options) {
    return this.approve({...options, kind:'signature'});
  }
  async reject(kind = 'transaction', requestId, onAttempt = () => {}) {
    await this.finish(kind, requestId, 'confirm-footer-cancel-button', /^(Reject|Cancel)$/, onAttempt);
  }
  async finish(kind, requestId, control, label, onAttempt) {
    const page = await this.request(kind);
    check(!await page.getByRole('dialog').isVisible(), 'UNEXPECTED_MODAL');
    const hash = new URL(page.url()).hash;
    check(!requestId || requestId === hash, 'REQUEST_CHANGED');
    const button = page.getByTestId(control);
    check(await button.count() === 1 && label.test((await button.innerText()).trim()), 'AMBIGUOUS_WALLET_CONTROL');
    check(await button.isVisible() && await button.isEnabled(), 'WALLET_CONTROL_UNAVAILABLE');
    check(new URL(page.url()).hash === hash, 'REQUEST_CHANGED');
    onAttempt(); // Count attempted authorization even if the click later times out.
    await button.click({timeout:10000});
    await page.waitForURL(url => url.hash !== hash).catch(async error => {
      if (!page.isClosed()) throw error;
    });
    check(this.pending().length === 0, 'REQUEST_STILL_PENDING');
  }
}
