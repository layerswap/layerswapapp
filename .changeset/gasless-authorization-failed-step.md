---
'@layerswap/widget-types': minor
'@layerswap/widget': minor
---

Report gasless authorization API failures as their own lifecycle step.

- New repeatable `onSwapLifecycle` step `gasless_authorization_failed` (stage `input_transfer`, outcome `failed`, action `authorize_deposit`). It is emitted when Layerswap's API refuses a signed gasless authorization, or when refreshing an expired authorization fails (`reasonCode: 'deposit_action_refresh_failed'`). These were previously reported as `wallet_action_failed`, which is now reserved for wallet signing failures. An exhaustive `switch` over `SwapLifecycleStep` needs a case for it.
- The re-sign after an expired gasless authorization now emits its own `wallet_prompt_opened`, so every wallet request has one.
- When gasless is marked unavailable (and the retry or switch-to-standard options are offered) is unchanged.
