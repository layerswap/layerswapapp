---
"@layerswap/wallet-svm": minor
"@layerswap/utils": minor
"@layerswap/ui-kit": minor
"@layerswap/wallet-bitcoin": minor
"@layerswap/wallet-evm": minor
"@layerswap/wallet-fuel": minor
"@layerswap/wallet-imtbl-passport": minor
"@layerswap/wallet-paradex": minor
"@layerswap/wallet-starknet": minor
"@layerswap/wallet-ton": minor
"@layerswap/wallet-tron": minor
"@layerswap/wallets": minor
"@layerswap/wallet-core": minor
"@layerswap/widget": minor
"@layerswap/widget-types": minor
---

Improvements and bug fixes

Support legacy, v0, and v1 Solana transfer payloads with Solana Kit. Add v1 signing through compatible Wallet Standard wallets and the Layerswap WalletConnect adapter, estimate fees from the prepared message, preserve co-signatures, and validate signed messages before submission. Confirm using signature status and actual transaction expiry, and accept v1 RPC responses with web3.js 1.99.0.

Accept unsigned legacy/v0 payloads with omitted signature entries and wallet-added priority fees, while preserving transfer details and checking the final fee before submission.

Use the CommonJS-compatible import for `js-sha3` so the utilities' main entry point loads in Node ESM.