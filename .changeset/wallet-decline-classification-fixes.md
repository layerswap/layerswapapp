---
'@layerswap/wallet-core': patch
'@layerswap/wallet-evm': patch
'@layerswap/wallet-starknet': patch
'@layerswap/wallet-paradex': patch
'@layerswap/wallet-stellar': patch
'@layerswap/wallet-fuel': patch
'@layerswap/wallet-ton': patch
'@layerswap/wallet-tron': patch
'@layerswap/wallet-bitcoin': patch
'@layerswap/wallet-svm': patch
---

Wallet declines are reported as declines, and node errors no longer pass for declines.

- `@layerswap/wallet-core/errors` exports `errorMessage(error)`: an Error's message, a string as is, or a plain `{ message }` object's string message, else `String(error)`. Every adapter's `toTransferError` uses it, so plain-object wallet rejections keep their text instead of `[object Object]`.
- Classifier: decline text must name the user (`user rejected`, `user denied`, `denied by the user`, …); the generic `rejected the request` phrase is gone, so a node's `origin rejected the request` is no longer `user_rejected`. A revert reason (`execution reverted: …`) never counts as a decline, and on a JSON-RPC server error (`-32000`..`-32099`) the text must start with `user rejected` / `user denied` — WalletConnect wallets that decline with `-32000 "User rejected the request."` stay `user_rejected`. Definitive codes (4001, 5000, `ACTION_REJECTED`, `UserRejectedRequestError`) are unchanged.
- EVM: `resolveError` checks decline evidence before the nested `-32000` insufficient-funds branch, so a decline relayed as `-32000` is no longer shown as insufficient funds.
- Starknet: a plain `{ code: 113, message: 'An error occurred (USER_REFUSED_OP)' }` rejection is a declared decline carrying its real message.
- Stellar: the signing-prompt vocabulary includes `reject` again, so Albedo's `Action request was rejected by the user.` is a decline.
- TON: TON Connect's `UserRejectsError` is a declared decline (with a name/message fallback for a duplicate SDK copy); the `Reject request` string is still recognised.
