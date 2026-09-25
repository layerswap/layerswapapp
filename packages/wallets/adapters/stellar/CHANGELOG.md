# @layerswap/wallet-stellar

## 2.3.0

### Patch Changes

- dc962d6: Transfer providers declare why a transfer failed instead of relying on the rejected UI label.
  - Every thrown transfer error is built with `walletActionError` / `userRejectedError` from `@layerswap/wallet-core/errors`: it keeps its `ActionMessageType` name for the UI, carries the original error as `cause`, always has a string `message`, and declares `reasonCode: 'user_rejected'` only for a wallet decline. The mapping lives in a pure `transferProvider/toTransferError` module per adapter, covered by `tests/transfer-errors.test.mjs`.
  - Starknet: `message` is a string again (it used to be the raw error object). `USER_REFUSED_OP` is a declared decline; `Execute failed` keeps the rejected copy but carries no reason code and is reported to the host as a failure until its wallet-side origin is verified.
  - Paradex: the `'reject'` substring heuristic is gone; only structured declines from the backing EVM/Starknet wallet (4001, viem `UserRejectedRequestError`, `USER_REFUSED_OP`) count as rejections, so sequencer/gateway rejections are failures.
  - Stellar: the decline vocabulary (`declin|cancel|closed`) applies only to the wallet prompt (`signTransaction`); account load, fee, simulation, validation and Horizon submission failures containing those words are failures (`UnexpectedErrorMessage` / `TransactionFailed` / `InsufficientFunds`).
  - Fuel, TON, TRON, Bitcoin, Solana: conditions unchanged; declines are declared explicitly and other failures keep their labels.

- f26c1e7: Wallet declines are reported as declines, and node errors no longer pass for declines.
  - `@layerswap/wallet-core/errors` exports `errorMessage(error)`: an Error's message, a string as is, or a plain `{ message }` object's string message, else `String(error)`. Every adapter's `toTransferError` uses it, so plain-object wallet rejections keep their text instead of `[object Object]`.
  - Classifier: decline text must name the user (`user rejected`, `user denied`, `denied by the user`, …); the generic `rejected the request` phrase is gone, so a node's `origin rejected the request` is no longer `user_rejected`. A revert reason (`execution reverted: …`) never counts as a decline, and on a JSON-RPC server error (`-32000`..`-32099`) the text must start with `user rejected` / `user denied` — WalletConnect wallets that decline with `-32000 "User rejected the request."` stay `user_rejected`. Definitive codes (4001, 5000, `ACTION_REJECTED`, `UserRejectedRequestError`) are unchanged.
  - EVM: `resolveError` checks decline evidence before the nested `-32000` insufficient-funds branch, so a decline relayed as `-32000` is no longer shown as insufficient funds.
  - Starknet: a plain `{ code: 113, message: 'An error occurred (USER_REFUSED_OP)' }` rejection is a declared decline carrying its real message.
  - Stellar: the signing-prompt vocabulary includes `reject` again, so Albedo's `Action request was rejected by the user.` is a decline.
  - TON: TON Connect's `UserRejectsError` is a declared decline (with a name/message fallback for a duplicate SDK copy); the `Reject request` string is still recognised.

- Updated dependencies [95d95a1]
- Updated dependencies [31d0d1f]
- Updated dependencies [5bd03c7]
- Updated dependencies [bdf46a0]
- Updated dependencies [f26c1e7]
- Updated dependencies [bdf46a0]
  - @layerswap/widget-types@2.3.0
  - @layerswap/wallet-core@2.3.0
  - @layerswap/utils@2.3.0

## 2.2.0

### Minor Changes

- Global improvements and bug fixes

### Patch Changes

- Updated dependencies
  - @layerswap/utils@2.2.0
  - @layerswap/wallet-core@2.2.0
  - @layerswap/widget-types@2.2.0

## 2.1.0

### Minor Changes

- Global fixes and improvements

### Patch Changes

- Updated dependencies
  - @layerswap/utils@2.1.0
  - @layerswap/wallet-core@2.1.0
  - @layerswap/widget-types@2.1.0
