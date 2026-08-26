# widget-react-host example

Demonstrates a host app integrating `@layerswap/widget-react`, which loads
the Layerswap widget at runtime from a Module-Federation remote. The host
bundle contains **only** `@layerswap/widget-react` (no widget code, no
wallet adapters, no `framer-motion`, etc.).

## Run locally

```bash
pnpm --filter widget-react-host-example dev -- --host 127.0.0.1 --port 3001 --no-open
```

Then open `http://127.0.0.1:3001/`. The loader fetches and verifies the manifest
from its built-in production channel, then loads the `remoteEntry.js` it points
at and mounts the widget. The host cannot replace the manifest URL or disable
verification.

The page has two tabs: **Swap** mounts `LayerswapWidget` (the full swap form)
and **Deposit** mounts `LayerswapDepositWidget` (the fixed-destination funding
flow, pointed at a demo Base USDC/ETH recipient). They are tabs rather than
side-by-side because only one Layerswap widget may be live per page — the
widget keeps process-global state.

## What's in the host bundle

Only `@layerswap/widget-react` (a few KB plus `@module-federation/runtime`).
React, react-dom, wagmi, viem, react-query, and zustand stay as the host's
own copies (declared peer-deps on `@layerswap/widget-react`) and are fed
into the MF shared scope so the remote uses those exact instances.
