# Page 2 timeline

Open `/timeline` directly with `pnpm dev` or on a Vercel Preview/Development deployment. `pages/timeline.dev.mjs` is a one-line export of `TimelinePage.tsx` in this feature folder. Next.js's public [pageExtensions](https://nextjs.org/docs/15/pages/api-reference/config/next-config-js/pageExtensions) option admits `dev.mjs` when [VERCEL_ENV](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_env) is `preview` or `development`, even during optimized `next build` deployments. Without `VERCEL_ENV`, only local `next dev` enables it. Explicit `production` or unknown environments exclude it. Existing production page filenames stay unchanged. Neither the timeline entry nor its fixtures enter production-environment bundles, and `/timeline`, `/timeline.dev`, and `/timeline.dev.mjs` all return 404 there. The route is marked `noindex`; selection is local React state. All accounts, hashes, dates, logos, and balances in `fixtures.ts` are synthetic. Fixture imports belong only to this route.

The `.mjs` ending matters: Next's default page extensions include `tsx`, `ts`, `jsx`, and `js`, so `.dev.tsx` would still be discovered in production. The `.dev.mjs` entry needs no custom loader, private Next APIs, environment overrides, or Webpack entry filtering. All UI remains in normal TypeScript files. The timeline uses Next.js's documented [per-page getLayout](https://nextjs.org/docs/15/pages/building-your-application/routing/pages-and-layouts#per-page-layouts) to render without the app's live providers and analytics. `_app.js` only applies the chosen layout, with the normal app layout as its default; it contains no timeline path check.

Canvas is the default layout. Its collapsible left panel contains the page heading, Transfer flow and Scenario selectors, and Preview mode. Hide the panel to expand the workspace; the compact Controls button reopens it. On mobile, the panel overlays the workspace. Hiding the panel preserves selection and preview state. Timeline keeps the Transfer flow picker and grouped scenario sidebar. Its Scenario selector lists only the selected flow, retaining section headings. The Timeline/Canvas switch stays fixed in the top-right corner at every screen size. Switching layouts preserves the selected flow, scenario and preview mode.

The Transfer flow picker organizes scenarios by the flow being exercised. Each flow keeps its setup, quotes, errors and outcomes together under section headings. Changing flows selects its first scenario and resets time and quote disclosure; the Component/Modal mode stays selected. The shared `Select` supports keyboard navigation, and each scenario shows its number of steps.

| Flow | Cases |
| --- | --- |
| Wallet transfers | Successful transfer, refuel, wallet setup, quotes and balances, submission errors, failures, expiration and refunds |
| Token swaps | Approval/sign/publication, existing allowance, native tokens, quote confirmation, retries and gasless fallback |
| Gasless transfers | Gasless transfer, authorization failures, submission failures and standard fallback |
| Manual deposits | Network/exchange instructions and changes to withdrawal limits |
| Hyperliquid withdrawals | Hyperliquid prerequisites, withdrawal, rejection and provider errors |
| Polymarket withdrawals | Polymarket prerequisites, withdrawal, rejection and provider errors |
| Page states | Initial loading and swap not found |

`model.ts` defines stable group/section IDs, labels and their display order. Every fixture declares a typed `group` and `section`; `scenarioGroups` in `fixtures.ts` builds the navigation, omitting empty sections. Declaration order only controls scenario order within each section. Add new cases to their transfer flow instead of creating top-level categories for errors, quotes or individual features.

Timeline controls reuse `Select`, `Tabs`, and `SecondaryButton` from `@layerswap/widget/internal`, including the group picker, mode switch, scenario rows, milestones, and Previous/Next actions. Tailwind handles the page layout and selected states. The widget's `layerswap-styles` scope wraps the shared preview; the shared select supplies its own scoped portal.

`model.ts` clamps time to each scenario's range, selects the latest preceding snapshot, and finds strictly earlier/later milestones. Every milestone supplies a complete `Page2Snapshot`; the selected second is passed separately as `now`. Scenario changes reset to the first milestone. Component/Modal mode switches preserve the selected scenario and time.

The **Timeline / Canvas** layout switch is independent of Component/Modal mode. Timeline shows one snapshot with time controls. Canvas arranges all milestones in reading order on a dotted workspace. The Pages per row selector defaults to three and allows one through the scenario’s total page count. Changing it refits the canvas without resetting previews. The preference survives scenario and layout switches; shorter scenarios use only the columns they need. Each frame shows its step number, timestamp, label and description and uses its own milestone time and independent quote disclosure. Changing scenarios resets the canvas and its disclosures; returning to Timeline restores its selected time and disclosure. Both layouts use the same read-only `Page2Preview`, and each widget frame has a unique ID so multiple previews can coexist.

Canvas starts with all frames fitted in view. Drag the background, Space-drag on the focused canvas, middle-drag, or use the mouse wheel/trackpad to pan. Ctrl/⌘ + wheel (including trackpad pinch) zooms around the pointer; toolbar buttons zoom around the viewport center, reset to 100%, or fit all frames. Each frame's Focus button or a double-click on the frame brings it into view. Touch users can drag and use the zoom buttons. Keyboard users can focus the canvas and use arrows to pan, +/− to zoom, 0 for 100%, and F to fit all. Zoom stays between 10% and 200%. The frame list is memoized so pan/zoom updates only move the workspace, preserving each preview's identity and local state.

`Page2Snapshot` includes typed backend `DepositAction[]`, the created swap ID, and controlled signature-error state. Frontend workflow snapshots pass these to the same wallet progress and action presenters as production. The timeline retains approval, signing and confirmation through processing and adds a receive step; native-token routes only show their applicable steps. The full quote is shown before execution. `shouldShowCompactSwapQuote` selects self-paid same-network swaps that compact after creation; other wallet transfers compact when processing starts, including gasless transfers. All flows use the same inline status header: a small gauge and heading on the left, with the description or elapsed time on the right. At completion, the gauge stays the same size and shows a checkmark beside the completion heading and time. The full quote stays in a separate card; only the compact quote attaches to the summary. Compacting collapses the extra quote rows while the gap and adjoining corners animate over 300ms, with reduced motion respected and the recipient kept mounted. The shared `StepsPanel` expands and fades in over 300ms in every flow, including wallet transfers, token swaps, gasless transfers, deposits, refuel, and refunds. On wallet-transfer and token-workflow entry, the sending or preparing button collapses concurrently; the quote and steps use the same duration and easing, without a second height animation around the workflow. Their heights change together, so the drawer never has to fit the full quote and full workflow at once. The shared steps provider preserves entrance state across the wallet-to-processing controller handoff, so confirming a submitted transaction does not collapse or fade in the already-visible timeline again. When progress actually disappears, the entrance resets for the next appearance. Later step updates keep the panel mounted; opening an existing workflow displays its settled state immediately. Token swaps keep their completed wallet and receive steps below, with the actual received amount and explorer link in the receive step. Transaction links use a small chain-link pill aligned to the right of each step title, with a “View transaction” tooltip on hover or keyboard focus. Input and refund links use the source explorer; output and refuel links use the destination explorer. No link appears without an available hash and explorer URL. Confirmation counts and status messages stay below the titles. If wallet action history is unavailable, the transaction icon appears below the header without inventing steps. The header, gauge, and completion layout update without animation. Wallet transfers and token swaps retain the attached compact quote through completion, including the recipient and minimum received amount. Full quote controls stay collapsed; step counts, quoted time and action buttons stay hidden from the completed progress card. The final amount remains in the token summary. Before processing, gasless quotes remain expandable. The overview stays mounted across withdrawal and processing: standard wallet and gasless quotes compact and attach to the summary over the same 300ms as the steps appear, using the same quote presentation as token swaps. The same controls-to-steps presence transition used by token swaps retains outgoing wallet controls until their exit finishes. Manual deposits from networks and exchanges use the same transition: the instructions, quote and copy button collapse as the summary and progress steps appear. Summary spacing is included in its height animation, so there is no instant jump when it first mounts. Rewinding restores the instructions and removes the outgoing summary after its exit. Rewinding wallet flows restores the same quote nodes. Hidden quote controls become inert immediately; reduced motion applies the end state without a transition. Both token swaps and standard transfers use the same compact step layout with 20px markers and connectors that stretch with the description.

Frontend execution stays pending continuously from approval through signing and publication, including backend refreshes between prompts. These milestones have no intermediate action buttons, matching the live controller's single execution loop. Publication moves directly to processing. Only the initial start, explicit receiving-amount confirmation, and error/retry states offer actions; a single-step flow retains its real disabled submitting button. Timeline navigation still advances simulated time manually.

`Page2Preview` is an internal widget export. It composes the same presentation components used by production Page 2 controllers, resolves lifecycle states with `resolveSwapPhase`, and never mounts those controllers. Live clocks, wallet execution, requests, persistence, logging, and support callbacks remain in the production controllers. Only quote disclosure controls have a callback, which updates local presentation state; moving through time or choosing a scenario restores the fixture's expanded state. Switching preview modes preserves the disclosure. Transaction actions remain blocked, and explorer links have no destination. The bridge app bypasses its live providers and analytics for this route.

Component mode uses the production `WidgetFrame`, including its header, content/footer spacing, and mobile minimum height. It has no additional preview minimum height; processing panels fit their current content with an 8px gap between the summary and progress card, and loading/not-found screens retain their 548px height. Modal mode uses the production drawer header, surface, and body styles inside the same expanded widget (650px minimum), with contained Page 2 content sized to fit. The backdrop stays inside the preview so timeline controls remain available.

Spinners, pending indicators, number changes, accordions, wallet-action transitions, and drawer entry animate as in the live flow. They respect `prefers-reduced-motion`. Cosmetic animation does not advance simulated time, and stepping or scrubbing keeps component identity so transitions work in both directions without restarting the whole preview.

## Shared UI and update behavior

`Page2Preview` and `Page2PreviewFrame` only map snapshot data to shared presenters. They contain no Page 2 HTML, icon substitutes, or copied styles. `ReadOnlyPreview` owns only the preview label and interaction boundary.

| Presentation | Shared by live controllers and snapshots |
| --- | --- |
| Summary, quote, fees, gas, slippage, token contract, rewards | `SummaryView`, `QuoteView`, `QuoteSummaryView`, `DetailedEstimatesView`, `GasFeeView`, `SlippageView`, `QuoteDetailsSummary`, `QuoteAvailabilityView` |
| Recipient and address details | `RecipientAddressView`, `AddressDetailsView`, `AddressIconView`, `AddressLabelView` |
| Manual deposit | `ManualInstructionsView`, `ManualSourceSelectorView`, `DepositQRCodeView`, UI kit `CopyButtonView`, `ManualDepositButtonView` |
| Wallet actions and warnings | `WalletActionsView`, `WalletSubmissionView`, `WalletTransferView`, balance/RPC/action-message and specialized-withdrawal presenters |
| Frontend wallet workflow | `DepositWorkflowView`, `SendTransactionView`, shared deposit-action labels and selection |
| Processing and errors | `ProcessingView`, `ProcessingSectionView`, `ElapsedTime`, failure/retry/not-found presenters |
| Layout and dialogs | `WidgetFrame`, `WidgetHeaderView`, shared navigation buttons and wallet header, `WidgetFooterView`, `Page2Contained`, `WithdrawContentView`, `PendingSwapView`, `DrawerPresentation`, `ConfirmationContent` |

Production controllers supply live data and callbacks; snapshots supply synthetic data and no external-action callbacks. The same address popover, copy/QR, slippage, gasless toggle, and network-selector presentation is used in both. Snapshot recipient metadata never comes from connected wallets or the address book. The modal preview uses the shared drawer surface inside the widget shell; it does not draw a mock Page 1 form behind it.

Edits to these shared presenters update both production and the timeline after rebuilding their package. The bridge imports built `dist` output: run `pnpm --filter @layerswap/ui-kit build` for UI kit changes, then `pnpm --filter @layerswap/widget build`. `pnpm --filter @layerswap/widget dev` watches widget TypeScript changes. New controller states still need representative snapshot data; their presentation must remain shared.

The tests enforce that neither Page 2 controllers nor snapshot adapters contain intrinsic JSX, that adapters do not import icons directly, and that every presenter they use is also reachable from production. They also mount all fixtures with network, wallet, persistence, and reporting traps.

## Coverage

| Coverage area | Rendering branches |
| --- | --- |
| Lifecycle and outcomes | Wallet success, input publishing/confirmations, output pending, completed before output, input/output failure, amount limits, expiration, refunds, deposit-flow wording |
| Frontend swaps | Permit2 approval → signature → publication, existing allowance, native-token publication, pending/completed actions, per-step rejection and retry, refresh/server failures, quote confirmation, gasless-to-standard fallback, full/compact quotes through processing |
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

The suite tests route discovery across local development and Vercel Preview/Development/Production environments, unchanged production URLs, time selection and resets, resolver expectations, provider-free rendering of every milestone, reduced-motion hydration, rewinding, elapsed-time text, preview interaction with network/wallet/storage/support/interval traps, and production presentation callbacks. Browser timeline checks can use `next dev` or a build with `VERCEL_ENV=preview` / `VERCEL_ENV=development`. Verify that a build with `VERCEL_ENV=production` has no timeline entry in its page/build manifests or timeline fixtures in its emitted chunks.

Browser checks should visit every milestone at desktop and mobile widths, exercise the slider with arrows/Home/End, check visible focus and milestone announcements, and confirm that waiting does not advance time. Only document/static asset requests are expected. Check both narrow (320px) and typical (390px) mobile layouts.

Check motion with both `no-preference` and `reduce`: spinners/pulses should run only with normal motion; expandable quote/error details should transition when stepping forward and backward. Status headers and gauges stay inline without animation in every state; compact quote details stay attached and visible at completion for wallet transfers and token swaps; wallet steps remain visible with completed checkmarks. Wait for transitions to settle before comparing rewound content, and check that rapid navigation settles on the latest selected snapshot. Opening modal mode should use the production drawer entry animation.
