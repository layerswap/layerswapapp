---
"@layerswap/widget": patch
"@layerswap/widget-types": patch
---

Suppress deferred insufficient-balance lifecycle events after transaction submission or input progress, while preserving genuine blocks on explicit retries. Report final amount mode and separate calculation-time and current source wallet/balance snapshots, including balance timestamps and gas reserves, so Max calculations can be distinguished from manual amounts and account changes.

Preserve a settled preset’s calculation provenance when switching or disconnecting source wallets by detaching it as a fixed amount. Actual manual edits still clear the snapshot.

In USD mode, a detached settled preset now keeps its token amount fixed when prices change after a wallet switch/disconnect; previously it followed USD prices as a manual amount. Explicit USD edits restore ordinary USD entry behavior.

Clear retained fixed-preset snapshots after amount or source-asset changes, and validate them again when emitting lifecycle diagnostics.
