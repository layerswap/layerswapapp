import { check, sleep } from './core.mjs';

/** Reject-only adapter. No signing, confirmation, provider replacement or background access. */
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
    const deadline = Date.now() + this.timeout;
    while (Date.now() < deadline) {
      const pages = this.pending();
      check(pages.length <= 1, 'MULTIPLE_PENDING_REQUESTS');
      if (pages.length) {
        const hash = new URL(pages[0].url()).hash;
        check(kind === 'connection' ? /^#\/connect\//.test(hash) : /^#\/confirm-transaction\//.test(hash), 'UNSUPPORTED_REQUEST_UI');
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
  async inspect() {
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
  async reject() {
    const page = await this.request('transaction');
    check(!await page.getByRole('dialog').isVisible(), 'UNEXPECTED_MODAL');
    const button = page.getByTestId('confirm-footer-cancel-button');
    check(await button.count() === 1 && /^(Reject|Cancel)$/.test((await button.innerText()).trim()), 'AMBIGUOUS_REJECTION');
    const hash = new URL(page.url()).hash;
    await button.click({timeout:10000}); // exactly once; never retry an uncertain click
    await page.waitForURL(url => url.hash !== hash).catch(async error => {
      if (!page.isClosed()) throw error;
    });
    check(this.pending().length === 0, 'REQUEST_STILL_PENDING');
  }
}
