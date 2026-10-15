# Foresight

A responsive prediction-market demo built with Next.js App Router, React, TypeScript, and Tailwind CSS. The featured funding journey highlights **deposits from Polymarket through Layerswap**.

## Run locally

Use Node.js 22.x.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The complete market demo works without credentials. For a production preview, run `npm run build` followed by `npm start`.

For the Cloudflare Tunnel at `https://test.plamo.world`, keep its service pointed at `http://localhost:3000`. The hostname is allowed in `next.config.ts` through `allowedDevOrigins`, which is required for development assets and the HMR WebSocket. If you change the tunnel hostname, update that entry. Allow the HTTPS origin in your Reown, Privy, and Layerswap dashboards as well. Wallet metadata uses the actual browser origin; `NEXT_PUBLIC_APP_URL` is the server-side fallback. During initial wallet-code loading, the app shows a branded status instead of a blank screen. For a shared demo without development compilation or HMR, run the production build with `npm run build` and `npm start` on the same port.

## Deploy to Vercel

Set the Vercel project's **Root Directory** to `examples/foresight` and use the **Next.js** framework preset. The app pins Node.js to 22.x to match `.nvmrc`. Add the public environment variables below in the project's settings before building.

The included `vercel.json` runs `npm ci` and `npm run build` from this directory, using the committed `package-lock.json` and this app's dependency overrides. This example is intentionally outside the parent pnpm workspace. Without the explicit install command, Vercel detects the repository's pnpm lockfile, installs only the parent workspace projects, and fails with “No Next.js version detected” because this app's dependencies were skipped. Redeploy after applying these settings.

## Connect real services

Put your **public browser credentials** into `.env.local`:

```dotenv
NEXT_PUBLIC_REOWN_PROJECT_ID=your_reown_project_id
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_LAYERSWAP_API_KEY=your_layerswap_widget_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEPOSIT_NETWORK=BASE_MAINNET
NEXT_PUBLIC_DEPOSIT_TOKEN=USDC
```

Next.js embeds these values at build time. Restart development or rebuild production after changing them. Never put server secrets, seed phrases, or private keys in a `NEXT_PUBLIC_` variable.

| Service | Dashboard configuration | App behavior |
| --- | --- | --- |
| [Reown AppKit](https://docs.reown.com/appkit/next/core/installation) | Create a project at [Reown Dashboard](https://dashboard.reown.com) and allow the exact app origin. | WalletConnect plus supported injected wallets. Supports Base, Polygon, Ethereum, Arbitrum, and Optimism. |
| [Privy](https://docs.privy.io/basics/react/setup) | Create an app at [Privy Dashboard](https://dashboard.privy.io), allow the app origin, enable email/Google methods, and enable embedded Ethereum wallets. An optional `NEXT_PUBLIC_PRIVY_CLIENT_ID` supports app clients. | Real email and social authentication; creates an embedded wallet for users without one. |
| [Layerswap Deposit Widget](https://docs.layerswap.io/widget/deposit-widget) | Generate a widget API key, allow the app origin, and enable the Polymarket integration for the key. | The featured flow passes `methods={['polymarket']}`. Other methods support wallet transfers and deposit addresses. |

The Polymarket option also depends on a supported route and Layerswap feature configuration. An allow-list permits a method; it does not enable a route or feature by itself. The source wallet must own the user's Polymarket account. Do not assume a new Privy wallet owns an existing Polymarket account: connect that account's owner wallet inside the widget when prompted.

The receiving address **always comes from the connected session**. It is never a hard-coded example address. The default destination is USDC on Base; override the network/token with supported Layerswap canonical identifiers. The destination address is visible in the live widget quote. When Reown is used, its Wagmi config is shared with the widget.

Every Deposit entry point opens Layerswap's own dialog directly through the SDK's `mode="button"` trigger. There is no app-specific deposit picker or confirmation step. The Polymarket banner limits the widget to the Polymarket method; other Deposit buttons let Layerswap show the available methods. If the receiving wallet is not connected, login is required first and Layerswap opens automatically after connection. Missing widget credentials produce a status message instead of a simulated funding dialog.

The host bundle preloads while browsing. Once the receiving wallet is connected, the SDK mounts in the background and remains mounted between opens, so repeated clicks reuse the verified CDN code and initialized providers. Changing accounts creates a fresh widget for the new receiving address. A click before background loading completes opens automatically when ready; a failed CDN load retries on the next click. Live route, balance, and quote requests still depend on Layerswap and network response times.

The widget's native `config.theme` is defined in `src/lib/layerswap-theme.ts`. It uses white dialog surfaces, subtle neutral panels, distinct cool-neutral selectors, Foresight violet actions/focus, and semantic amber/green/rose status colors. Both full color scales are supplied.

The palette follows [Atlassian's guidance on neutral, brand, and semantic roles](https://atlassian.design/foundations/color/) and [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). The former secondary text measured 3.93:1 on panels and 2.97:1 on selectors. The revised text measures 5.81:1 and 5.12:1 respectively; amber warning text on its warm background is 5.93:1. White labels on the violet CTA are 4.96:1, increasing to 6.35:1 on hover. These checks cover the named color pairs, not a claim that every vendor screen is WCAG-conformant.

A few color-only rules are scoped to `.layerswap-styles` because the SDK assigns the same neutral token to ordinary surfaces and warning tooltips, and reuses white primary-button text on neutral quick-action hover states. These rules separate warning badges/tooltips from neutral surfaces, keep quick-action hover labels readable, preserve CTA hover contrast, and provide a visible keyboard focus outline. They do not modify deposit behavior.

Without credentials, the app shows honest setup states. A browser wallet can still connect directly through EIP-1193 when available. The app never simulates a successful login or fabricates a deposit address.

## Demo behavior

- Eight fictional markets with sample prices, volumes, and chart history.
- Category and text search, sorting, probability filter, and watchlists.
- Buy simulated Yes/No or named-outcome shares with $1,000 in play money.
- Portfolio and activity views persist in local storage and can be reset.
- Mobile navigation, keyboard search shortcut (`/`), native accessible dialogs, and reduced-motion support.

Real Layerswap deposits fund the user's own wallet. They **never** increase the demo trading balance. There is no trading smart contract, custody, order book, real-money trading, or settlement engine.

The source does not include API credentials. Live Privy authentication, WalletConnect pairing, Polymarket route eligibility, and a real deposit need your credentials and an owning wallet to verify end to end.

## Structure

```text
src/app/                    Next.js entry points, metadata, styles
src/components/market-app   Market browser, demo trading, portfolio, dialogs
src/components/auth/       Reown, Privy, and injected wallet session adapters
src/components/deposit-widget  Real Layerswap widget, callbacks, and errors
src/components/artwork     Self-contained SVG/CSS visual assets
src/lib/markets            Fictional market data and demo state types
```

Wallet SDKs and the deposit widget are split into client chunks. The Layerswap package loads its verified remote widget from its CDN at runtime; permit the vendor's endpoints in any deployment CSP. Google Fonts is used with local system fallbacks.

The dependency overrides deliberately align the SDKs on Wagmi 2. The Layerswap loader's optional Wagmi peer is types-only, while the Reown adapter's open-ended connector dependency otherwise resolves to a newer incompatible major. `package-lock.json` records the verified dependency tree.

## Verification

`npm run build` compiles and checks TypeScript. `npm run typecheck` provides a separate type check.

Browser verification covered filtering, saving a market, demo order math, portfolio persistence after reload, mobile search and navigation, the Polymarket method selection, missing-credential states, and a test-only injected wallet fixture for connection/disconnection and recipient binding. No real transaction was submitted.
