# Page 2 timeline

Run `pnpm dev` and open `/timeline` directly. `pages/timeline.dev.mjs` is a one-line export of `TimelinePage.tsx` in this feature folder. Next.js's public [pageExtensions](https://nextjs.org/docs/15/pages/api-reference/config/next-config-js/pageExtensions) option admits `dev.mjs` only during `PHASE_DEVELOPMENT_SERVER`. Existing production page filenames stay unchanged. Neither the timeline entry nor its fixtures enter production bundles, and `/timeline`, `/timeline.dev`, and `/timeline.dev.mjs` all return 404 in production. The route is marked `noindex`; selection is local React state. All accounts, hashes, dates, logos, and balances in `fixtures.ts` are synthetic. Fixture imports belong only to this route.

The `.mjs` ending matters: Next's default page extensions include `tsx`, `ts`, `jsx`, and `js`, so `.dev.tsx` would still be discovered in production. The `.dev.mjs` entry needs no custom loader, private Next APIs, environment overrides, or Webpack entry filtering. All UI remains in normal TypeScript files. The timeline uses Next.js's documented [per-page getLayout](https://nextjs.org/docs/15/pages/building-your-application/routing/pages-and-layouts#per-page-layouts) to render without the app's live providers and analytics. `_app.js` only applies the chosen layout, with the normal app layout as its default; it contains no timeline path check.

`model.ts` clamps time to each scenario's range, selects the latest preceding snapshot, and finds strictly earlier/later milestones. Every milestone supplies a complete `Page2Snapshot`; the selected second is passed separately as `now`. Scenario changes reset to the first milestone. Component/Modal mode switches preserve the selected scenario and time.

`Page2Preview` is an internal widget export. It composes the same presentation components used by production Page 2 controllers, resolves lifecycle states with `resolveSwapPhase`, and never mounts those controllers. Live clocks, wallet execution, requests, persistence, logging, and support callbacks remain in the production controllers. Only quote disclosure controls have a callback, which updates local presentation state; moving through time or choosing a scenario restores the fixture's expanded state. Switching preview modes preserves the disclosure. Transaction actions remain blocked, and explorer links have no destination. The bridge app bypasses its live providers and analytics for this route.

Component mode uses the production `WidgetFrame`, including its header, content/footer spacing, and mobile minimum height. It has no additional preview minimum height; the processing panel retains its production 410px minimum and loading/not-found screens retain their 548px height. Modal mode uses the production drawer header, surface, and body styles inside the same expanded widget (650px minimum), with contained Page 2 content sized to fit. The backdrop stays inside the preview so timeline controls remain available.

Spinners, pending indicators, number changes, accordions, wallet-action transitions, and drawer entry animate as in the live flow. They respect `prefers-reduced-motion`. Cosmetic animation does not advance simulated time, and stepping or scrubbing keeps component identity so transitions work in both directions without restarting the whole preview.

## Shared UI and update behavior

`Page2Preview` and `Page2PreviewFrame` only map snapshot data to shared presenters. They contain no Page 2 HTML, icon substitutes, or copied styles. `ReadOnlyPreview` owns only the preview label and interaction boundary.

| Presentation | Shared by live controllers and snapshots |
| --- | --- |
| Summary, quote, fees, gas, slippage, token contract, rewards | `SummaryView`, `QuoteView`, `QuoteSummaryView`, `DetailedEstimatesView`, `GasFeeView`, `SlippageView`, `QuoteDetailsSummary`, `QuoteAvailabilityView` |
| Recipient and address details | `RecipientAddressView`, `AddressDetailsView`, `AddressIconView`, `AddressLabelView` |
| Manual deposit | `ManualInstructionsView`, `ManualSourceSelectorView`, `DepositQRCodeView`, UI kit `CopyButtonView`, `ManualDepositButtonView` |
| Wallet actions and warnings | `WalletActionsView`, `WalletSubmissionView`, `WalletTransferView`, balance/RPC/action-message and specialized-withdrawal presenters |
| Processing and errors | `ProcessingView`, `ProcessingSectionView`, `ElapsedTime`, failure/retry/not-found presenters |
| Layout and dialogs | `WidgetFrame`, `WidgetHeaderView`, shared navigation buttons and wallet header, `WidgetFooterView`, `Page2Contained`, `WithdrawContentView`, `PendingSwapView`, `DrawerPresentation`, `ConfirmationContent` |

Production controllers supply live data and callbacks; snapshots supply synthetic data and no external-action callbacks. The same address popover, copy/QR, slippage, gasless toggle, and network-selector presentation is used in both. Snapshot recipient metadata never comes from connected wallets or the address book. The modal preview uses the shared drawer surface inside the widget shell; it does not draw a mock Page 1 form behind it.

Edits to these shared presenters update both production and the timeline after rebuilding their package. The bridge imports built `dist` output: run `pnpm --filter @layerswap/ui-kit build` for UI kit changes, then `pnpm --filter @layerswap/widget build`. `pnpm --filter @layerswap/widget dev` watches widget TypeScript changes. New controller states still need representative snapshot data; their presentation must remain shared.

The tests enforce that neither Page 2 controllers nor snapshot adapters contain intrinsic JSX, that adapters do not import icons directly, and that every presenter they use is also reachable from production. They also mount all fixtures with network, wallet, persistence, and reporting traps.

## Coverage

| Fixture group | Rendering branches |
| --- | --- |
| Lifecycle and outcomes | Wallet success, input publishing/confirmations, output pending, completed before output, input/output failure, amount limits, expiration, refunds, deposit-flow wording |
| Refuel | Upcoming, pending after output, complete |
| Manual deposit | Loading, address pending/ready, network/exchange source, expanded details, adjusted withdrawal limits |
| Wallet | Connection, network switching, preparation, confirmation, all current action error messages, balance refresh |
| Quotes and gas | Loading/error, updates, insufficient gas, critical receiving amount and confirmation |
| Gasless | Signing/publishing, unavailable, expired/insufficient/rejected authorization, retry, standard transfer, submission failure |
| Specialized withdrawals | Hyperliquid/Polymarket connection, mismatch, prerequisite progress, withdrawal, rejection, provider error variants |
| Supporting states | Initial loading, not found, swap error, RPC warning/update/success/failure |

There are no fixtures for legacy delayed statuses or refund-failure steps that the current resolver cannot produce. Network/token combinations and external wallet screens are outside this catalog.

## Validation

From the workspace root, after the workspace dependencies have been built:

```sh
pnpm --filter @layerswap/widget build
pnpm --filter @layerswap/bridge test:timeline
pnpm --filter @layerswap/widget check:types
pnpm --filter @layerswap/bridge check:types
pnpm --filter @layerswap/bridge build
```

The suite tests development-only route discovery and unchanged production URLs, time selection and resets, resolver expectations, provider-free rendering of every milestone, reduced-motion hydration, rewinding, elapsed-time text, preview interaction with network/wallet/storage/support/interval traps, and production presentation callbacks. Browser timeline checks must use `next dev`; verify that a production build has no timeline entry in its page/build manifests or timeline fixtures in its emitted chunks.

Browser checks should visit every milestone at desktop and mobile widths, exercise the slider with arrows/Home/End, check visible focus and milestone announcements, and confirm that waiting does not advance time. Only document/static asset requests are expected. Check both narrow (320px) and typical (390px) mobile layouts.

Check motion with both `no-preference` and `reduce`: spinners/pulses should run only with normal motion; quote/error details and confirmation gauges should transition when stepping forward and backward. Wait for transitions to settle before comparing rewound content, and check that rapid navigation settles on the latest selected snapshot. Opening modal mode should use the production drawer entry animation.
