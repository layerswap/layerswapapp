---
'@layerswap/widget': minor
'@layerswap/widget-types': minor
'@layerswap/wallet-core': minor
'@layerswap/wallet-fuel': patch
---

Switch the wallet to the source chain from the send button instead of a separate step.

- The standalone "Switch network" button on the wallet withdrawal step is gone. When the connected wallet reports a chain other than the swap's source chain (EVM and Fuel wallets), tapping the send button now asks the wallet to switch and continues to swap creation and the transaction or gasless signature prompt without another tap. A switch the wallet completes without asking shows nothing; if the wallet is still waiting after a second, the button reads "Switching network" with a "confirm in your wallet" message. Already-approved WalletConnect chains switch locally with no wallet prompt. Rejections and failures keep the button as "Try again" with the "Network switch failed" message.
- `ChangeNetworkButton` is no longer exported from `@layerswap/widget/internal`.
- `onSwapLifecycle` still emits `network_switch_started`, `network_switched`, `network_switch_rejected` and `network_switch_failed`; their `path` is now `SendTransactionButton`.
- The switch waits at most 60 seconds for the wallet, so an in-app browser that never answers a dismissed prompt no longer leaves the send flow stuck; the attempt is reported with `reasonCode: timeout`.
- New `WalletErrorReasonCode` `request_pending` (`@layerswap/widget-types`), recognised by `normalizeWalletErrorCode` from EIP-1193 `-32002` and "already pending" / "already processing" messages. A second tap while the wallet still shows the switch prompt is reported as `network_switch_failed` with `reasonCode: request_pending` and tells the user to confirm the pending request in the wallet.
- `@layerswap/wallet-fuel`: `switchChain` now rethrows after logging instead of swallowing the failure, so the send flow stops rather than transferring on the wrong network.
