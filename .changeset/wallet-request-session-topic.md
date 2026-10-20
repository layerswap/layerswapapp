---
'@layerswap/widget-types': patch
'@layerswap/wallet-core': patch
'@layerswap/wallet-evm': patch
'@layerswap/wallet-svm': patch
'@layerswap/widget': patch
---

Match mobile wallet-request recovery to the WalletConnect session that received
the request. Recorded requests now carry their session `topic`, and EVM and
Solana WalletConnect wallets expose theirs as `Wallet.metadata.walletConnectTopic`.
Wallets connected through the generic WalletConnect connector recover their
requests, and another wallet app using the same account no longer does.

Show reconnect guidance when the wallet disconnects during source-network
readiness, and report readiness failures that happen before a network switch.
