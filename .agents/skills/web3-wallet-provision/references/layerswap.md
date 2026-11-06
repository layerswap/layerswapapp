# Layerswap wallet-aware setup

Inventory checked against Layerswap commit 97e50ad5d712d77cf321dc7df681e8ca8b63b81d on 2026-11-04, including the current workspace and wallet-ui-tests reference checkout. The user wants natural requests such as “Install Braavos for Starknet”, “Set up Phantom for Solana”, “Create a TronLink wallet”, or any other wallet actually offered by Layerswap. Resolve the wallet/chain and perform its native setup rather than requiring another hardcoded adapter before trying.

## Provider evidence and discovery routes

| Family/provider | Code or dependency evidence | Names/routes to discover |
| --- | --- | --- |
| EVM | packages/wallets/adapters/evm/src/EVMProvider/Connectors.ts | MetaMask Connect, Coinbase Wallet, browser-injected wallets including EIP-6963 discovery, WalletConnect and its dynamic wallet catalog. Rabby and other injected wallets must be confirmed at runtime. |
| Starknet | packages/wallets/adapters/starknet/src/init.ts | argentX (current Ready X, formerly Argent X), Braavos, Keplr, Xverse, Fordefi, OKX; Controller and WebWallet; additional mobile discovery. |
| Solana | packages/wallets/adapters/svm/src/init.ts | Phantom, Nightly, Solflare, Bitget, Trust, Ledger and two WalletConnect paths. Distinguish hardware Ledger from software wallets. |
| Tron | packages/wallets/adapters/tron/src/init.ts | MetaMask Tron adapter, TronLink, OKX, BitKeep/Bitget, Bybit, Gate, Trust. Verify wallet-specific native chain availability rather than assuming its EVM account is the Tron account. |
| Bitcoin | packages/wallets/adapters/bitcoin/src/service/connectorsConfigs.ts | Xverse, UniSat, Ctrl (io.xdefi), OKX, Bitget, OneKey, Leather, MetaMask, Trust. Source includes official install-link candidates. Choose the native Bitcoin receive/account address, not an EVM address from the same wallet. |
| Fuel | packages/wallets/adapters/fuel/src/init.ts | Fuel Wallet, Fuelet, Bako Safe. Bako multisig/service setup may need identities, co-signers or an onchain step: do not silently perform these. |
| TON | packages/wallets/adapters/ton/src/init.ts and service/TonConnectionService.ts | SDK/runtime TON Connect list; not a hardcoded list of TON brands. Query the actual SDK/picker, including Tonkeeper or others only when returned. TON provider is conditional on host config. |
| Stellar | packages/wallets/adapters/stellar/src/service/stellarKitManager.ts | Stellar Wallets Kit defaultModules plus conditional WalletConnect. Installed 2.5.0 defaults include Albedo, Freighter, Fordefi, Rabet, xBull, LOBSTR, Hana, Klever, OneKey, Bitget, CactusLink and Dcent. Product/platform availability must be checked live. |
| Paradex | packages/wallets/adapters/paradex/src/service/ParadexConnectionService.ts | Delegates to EVM/Starknet wallets. Its authorization flow can invoke signing: provisioning a backing wallet is separate and must not claim a completed Paradex account. |
| Immutable Passport | packages/wallets/all/src/index.ts; imtblPassport adapter | Conditional external-identity product, not a seed-phrase extension. Needs user identity/login handling and is not automatically provisioned by installing a browser wallet. |

The bridge host in apps/bridge/components/WidgetWrapper.tsx supplies TON configuration in the browser, enables Immutable Passport only when its client/publishable configuration exists, and allows host walletProviders overrides. WalletConnect chain registration in packages/wallets/all/src/walletConnectRegistry.ts covers EVM, Solana and Stellar.

These are integration candidates, not evidence that every listed product currently distributes an extension or that all onboarding flows were tested. Host configuration, feature flags, source chain and browser determine what the live picker actually offers. Do not add unrelated chain families merely because a wallet registry advertises them.

## Resolve a requested name on demand

Run `node <skill>/scripts/discover-wallets.mjs <repo> "Braavos"`. Add `--registry` to query Layerswap's credential-free public metadata endpoint. The snapshot in layerswap-wallets.json is a discovery seed with source probes/aliases, not a permanent allowlist. Re-read matching files and confirm the actual UI for the selected chain. Unknown names return DISCOVERY_REQUIRED: inspect the runtime catalog, vendor and wallet connector before deciding unsupported.

The public registry endpoint is `POST https://layerswap.io/app/api/wallet-registry` with JSON `{"names":["wallet name"]}`. No API key, wallet password or recovery phrase is needed. It is a name lookup, not a full enumeration endpoint, and the inspected server snapshot covers EVM/Solana namespaces; absence there does **not** disprove Starknet, TON, Bitcoin, Tron, Fuel or Stellar integration. The checked live response returned MetaMask, Rabby, Phantom, Solflare, OKX and Trust entries for a sample batch, but not every requested name. Registry metadata may be incomplete/outdated; verify actual vendor platforms.

For EVM/registry wallets also inspect core/src/lib/walletConnect/registryEntryIndex.ts and dynamic stores. For Stellar inspect the installed SDK's defaultModules implementation/version; do not treat package-derived names as static app configuration. For TON inspect the live TonConnect getWallets()/picker and injected-versus-remote metadata. Read-only runtime discovery is permitted; do not read extension background secrets or trigger signing to populate a list.

## Installation and identity

Browser-extension candidates: verify official download → store publisher/ID → current version → trusted code digest. The installer takes that verified ID explicitly for any compatible Chromium extension with a key-bearing MV3 manifest. It is no longer restricted to MetaMask. Native browser-store installation is the fallback when distribution/manifest format cannot be safely staged.

Argent X naming: Layerswap's connector ID remains argentX; current vendor documentation calls the extension Ready X. Use the vendor's wallet-specific help page below and its store links. Do not confuse a generic Ready-branded website/product with the Starknet extension.

Verified official entry pages, checked 2026-11-04:
- Ready X: https://help.wallet.ready.co/hc/en-us/articles/28313046540829-What-is-Ready-X (official Chrome ID dlcobpjiigpikoobohmabehhmhfoodbb).
- Braavos: https://braavos.app/download-braavos-wallet/ (follow the official Chrome/Firefox/Edge links).
- Phantom: https://phantom.com/download (official Chrome ID bfnaelmomeimhlpmgjnjophhpkkoljpa).
- TronLink: https://www.tronlink.org/ (official site identifies itself; follow its install links).
- MetaMask: https://metamask.com/download.
- Starknet ecosystem cross-check: https://www.starknet.io/wallets/.

Other source/registry install links are candidates until independently verified against the vendor. Do not guess store IDs or use third-party CRX mirrors. A compatibility request does not authorize installation of an unrelated substitute wallet.

## Address completion without EVM assumptions

Call `completeWallet(ref, fullNativeAddress, {family, validator})`. The vault records family alongside the native observed address. Simple EVM/Starknet/Fuel format checks are built in and labelled format-only. For all families prefer the target app's existing appropriate validator or an official SDK. In Layerswap, packages/utils/src/address/instance.ts exports addressUtilsProviders with EVM, Bitcoin, Solana, TON, Starknet, Tron, Fuel and Stellar validators. Reuse the provider for the **selected family/network**, never guess family from a shared 0x shape.

Example local integration (this imports public address utilities only, not a signer):

```js
import {loadLayerswapValidator} from '/skill/scripts/layerswap-address.mjs';
const validator=await loadLayerswapValidator('/repo','starknet',observedNetwork);
const publicResult=await completeWallet(ref,observedNativeAddress,{family:'starknet',validator});
```

The optional loader uses the app's installed esbuild to bundle only public address utilities into a private temporary module. Direct Node imports of this repo's bundler-style ESM dist may fail on extensionless imports; do not alter application source to fix test tooling. If esbuild is unavailable, reuse the app's existing test loader or the appropriate official SDK. Use the requested wallet's actual account/network display. Report Starknet deployment status separately; creating a counterfactual address is not deploying an account. TON bounceability/test flags and Bitcoin network/address type matter. Preserve Stellar account activation status and required memo metadata separately where applicable. Do not deploy, activate, fund, sign or broadcast to make setup appear complete.

## Appropriate outcome by product

- Software extension and locally accessible phrase: perform installation/native setup, encrypt newly generated credentials, return observed public address and setup state.
- Hardware: install verified companion software if appropriate; device initialization/backup stays on the device with the user. Never generate/import hardware seed words on the host.
- Mobile: use supported device tooling if available; otherwise provide the exact official app/device step and mark USER_ACTION_REQUIRED. A QR connection transport cannot create a mobile wallet by itself.
- Passkey/social/organization/multisig: discover the actual prerequisites; do available local steps, stop at the external identity/device/co-signer or transaction boundary. Never fabricate a password/phrase or claim a fully provisioned account.
- Unknown new wallet/version: investigate it on invocation; use BLOCKED/UNSUPPORTED only for a demonstrated tooling/distribution limitation, not merely because its name is absent from the seed catalog.

This makes any compatible wallet a valid request. It does not establish that every Layerswap-compatible wallet can be created unattended in a desktop browser, or that every native flow has been executed already.

## Verification of this expansion

On 2026-11-04: 38 unique seed-catalog names resolved against source/SDK bootstrap evidence; the credential-free live wallet-registry sample lookup succeeded; 13 automated helper tests passed, including non-MetaMask extension staging, Starknet completion, validator delegation and unknown-wallet discovery. The optional Layerswap validator integration was exercised with public/synthetic address fixtures for EVM, Starknet, Fuel, Solana, Bitcoin, Tron, Stellar and TON; all eight passed. This expansion did not install or create all those wallets. Actual native creation, backup and successful Layerswap connection remain per-wallet runtime checks, never inferred from a catalog entry.
