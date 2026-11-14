# Wallet E2E report (example, not execution evidence)

Status: BLOCKED

Project/app/commit/branch: record actual values.
Scenario/wallet/version/browser/public account/chain/request type: record actual values.
Expected: native request inspected and resolved using the requested approval, signature or rejection; matching app result observed.
Observed: wallet locked before connection; no transaction request opened.

| Check | Outcome |
| --- | --- |
| Connection | NOT_RUN |
| Native confirmation | NOT_RUN |
| Wallet details | NOT_RUN |
| Requested wallet action | NOT_RUN |
| App result | NOT_RUN |

Amount/token/recipient/spender/estimated fee/warnings/simulation: not observed.
Screenshots/trace/console errors: unavailable (recording disabled during unlock).
Intentional authorization attempts: 0 (wallet locked before execution). Action completion: not observed. Independent broadcast/settlement or signature verification: unknown.
Next prerequisite: privately unlock the dedicated test profile; never share a recovery phrase.
