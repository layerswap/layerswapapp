# Layerswap UI

Layerswap's web interface and supporting packages for cross-chain token transfers.

## Local development

Requires Node.js 24 and pnpm 10.

Create `.env.local`:

```env
NEXT_PUBLIC_LS_API=https://api-dev.layerswap.cloud/
NEXT_PUBLIC_API_KEY=testnet
```

Then install dependencies and start the bridge app:

```bash
pnpm install
pnpm build:packages
pnpm dev
```

Use `mainnet` instead of `testnet` for mainnets.
