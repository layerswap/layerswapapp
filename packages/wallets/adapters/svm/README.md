# @layerswap/wallet-svm

Solana (SVM) wallet provider for the Layerswap Widget. Enables Solana wallet connections and transactions.

## Installation

```bash
npm install @layerswap/wallet-svm
# or
yarn add @layerswap/wallet-svm
# or
pnpm add @layerswap/wallet-svm
```

## Quick Start

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import { createSVMProvider } from "@layerswap/wallet-svm";

export default function Page() {
  const svmProvider = createSVMProvider({
    walletConnectConfigs: {
      projectId: "your-project-id",
      name: "Your App",
      description: "Your app description",
      url: "https://your-app.com",
      icons: ["https://your-app.com/icon.png"]
    }
  });
  
  return (
    <LayerswapProvider walletProviders={[svmProvider]}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage

Use `createSVMProvider()` to create a Solana wallet provider:

```tsx
import { createSVMProvider } from "@layerswap/wallet-svm";

const svmProvider = createSVMProvider({
  walletConnectConfigs: {
    projectId: "your-project-id",
    name: "Your App",
    description: "Your app description",
    url: "https://your-app.com",
    icons: ["https://your-app.com/icon.png"]
  }
});
```

### Supported Wallets

- Phantom
- Solflare
- Backpack
- And other Solana wallet adapters

## Documentation

For detailed setup instructions, configuration options, and usage examples, see the [Solana (SVM) Wallet Provider documentation](https://docs.layerswap.io/integration/UI/Widget/WalletManagement/SVMWallet).

## Features

- Solana wallet connection via Solana wallet adapters
- Balance checking
- Gas/fee estimation
- Address validation and utilities
- Solana transaction support
- WalletConnect support for Solana

## Agave 4.2 compatibility

Transaction lookups accept legacy, v0, and v1 responses using `@solana/web3.js` 1.99.0 or later and `maxSupportedTransactionVersion: 1`.

Transfer `callData` accepts base64-encoded legacy, v0, and v1 transactions. Solana Kit encodes the transfer message, including v1 transaction configuration and trailing signatures. Fee estimation uses the prepared message and the RPC's total fee in lamports.

Legacy and v0 transactions use the existing wallet adapters. For v1, Wallet Standard wallets must advertise version 1 on `solana:signTransaction`; the Layerswap WalletConnect adapter sends serialized bytes and requires a full signed transaction response. Other adapters reject v1 inputs before signing. The connected wallet and target network must support v1; this change does not activate the network feature gate.

Unsigned legacy/v0 payloads may omit all signature entries; the provider initializes empty entries for the wallet to sign. Unsigned transfers receive a fresh blockhash before fee estimation. Pre-signed transfers keep their original blockhash and co-signatures, and expired inputs are rejected. Durable nonce transfers are not supported.

Wallets may add or adjust compute-unit limits and priority fees on unsigned legacy/v0 transfers. The provider checks that the fee payer, blockhash, account permissions, lookup tables, and transfer instructions remain unchanged, then checks the final RPC fee against the balance before submission. V1 and pre-signed transfers require the exact original message. All wallet responses require valid signatures from every signer.

The provider confirms transactions by signature and block height, or blockhash validity for pre-signed inputs. Its RPC polling cadence is independent of slot duration. It does not depend on account-update frequency, reward parsing, or Token-2022 confidential-transfer instruction parsing.

Run `pnpm --filter @layerswap/wallet-svm test` for offline transfer and signing fixtures. These tests do not replace testing with a connected wallet on a network where v1 is enabled.

## TypeScript

This package includes TypeScript definitions. All types are exported from the main entry point.

## License

MIT

## Repository

[GitHub](https://github.com/layerswap/layerswapapp/tree/main/packages/wallets/svm)
