---
'@layerswap/wallet-starknet': patch
'@layerswap/wallet-paradex': patch
'@layerswap/wallet-stellar': patch
'@layerswap/wallet-fuel': patch
'@layerswap/wallet-ton': patch
'@layerswap/wallet-tron': patch
'@layerswap/wallet-bitcoin': patch
'@layerswap/wallet-svm': patch
---

Transfer providers declare why a transfer failed instead of relying on the rejected UI label.

- Every thrown transfer error is built with `walletActionError` / `userRejectedError` from `@layerswap/wallet-core/errors`: it keeps its `ActionMessageType` name for the UI, carries the original error as `cause`, always has a string `message`, and declares `reasonCode: 'user_rejected'` only for a wallet decline. The mapping lives in a pure `transferProvider/toTransferError` module per adapter, covered by `tests/transfer-errors.test.mjs`.
- Starknet: `message` is a string again (it used to be the raw error object). `USER_REFUSED_OP` is a declared decline; `Execute failed` keeps the rejected copy but carries no reason code and is reported to the host as a failure until its wallet-side origin is verified.
- Paradex: the `'reject'` substring heuristic is gone; only structured declines from the backing EVM/Starknet wallet (4001, viem `UserRejectedRequestError`, `USER_REFUSED_OP`) count as rejections, so sequencer/gateway rejections are failures.
- Stellar: the decline vocabulary (`declin|cancel|closed`) applies only to the wallet prompt (`signTransaction`); account load, fee, simulation, validation and Horizon submission failures containing those words are failures (`UnexpectedErrorMessage` / `TransactionFailed` / `InsufficientFunds`).
- Fuel, TON, TRON, Bitcoin, Solana: conditions unchanged; declines are declared explicitly and other failures keep their labels.
