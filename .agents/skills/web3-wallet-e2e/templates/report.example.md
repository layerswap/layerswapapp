# Wallet E2E report (example, not execution evidence)

Status: BLOCKED

Project/app/commit/branch: record actual values.
Scenario/wallet/version/browser/public account/chain/request type: record actual values.
Expected: native request inspected, rejected and app recovery observed.
Observed: wallet locked before connection; no transaction request opened.

| Check | Outcome |
| --- | --- |
| Connection | NOT_RUN |
| Native confirmation | NOT_RUN |
| Wallet details | NOT_RUN |
| Request rejected | NOT_RUN |
| App recovery | NOT_RUN |

Amount/token/recipient/spender/estimated fee/warnings/simulation: not observed.
Screenshots/trace/console errors: unavailable (recording disabled during unlock).
Intentional authorization actions: 0. Independent broadcast verification: unknown.
Next prerequisite: privately unlock the dedicated test profile; never share a recovery phrase.
