
<div align="center">

[![npm latest package](https://img.shields.io/npm/v/@layerswap/widget/latest.svg)](https://www.npmjs.com/package/@layerswap/widget)
[![Follow on X](https://img.shields.io/twitter/follow/layerswap.svg?label=follow+Layerswap)](https://x.com/layerswap)

</div>

<h1 align="center">Layerswap Widget</h1>

<img alt="layerswap" src="https://layerswap.io/app/opengraph.jpg" />

## Installation

### Layerswap Widget

Layerswap Widget is available as an [npm package](https://www.npmjs.com/package/@layerswap/widget).

**pnpm:**

```sh
pnpm add @layerswap/widget wagmi viem zustand @tanstack/react-query
```

**npm:**

```sh
npm install @layerswap/widget wagmi viem zustand @tanstack/react-query
```

**yarn:**

```sh
yarn add @layerswap/widget wagmi viem zustand @tanstack/react-query
```

## Getting started with Layerswap Widget

Here is an example of a basic app using Layerswap Widget:

```tsx
import { LayerswapProvider, Swap } from '@layerswap/widget';

export const WidgetPage = () => {
  return (
    <LayerswapProvider>
      <Swap />
    </LayerswapProvider>
  );
};
```

You can create your custom wallet provider if you want to use RainbowKit, Dynamic, etc.

```tsx
import { LayerswapProvider, Swap, WalletHooksProvider } from '@layerswap/widget';
import useCustomEVM from "../hooks/useCustomEvm";

function CustomHooks ({ children }: { children: ReactNode }) {
    const customEvm = useCustomEVM()
    return <WalletHooksProvider overides={{ evm: customEvm }}>
        {children}
    </WalletHooksProvider>
}

export const WidgetPage = () => {

  return (
    <LayerswapProvider>
      <CustomHooks>
        <Swap />
      <CustomHooks>
    </LayerswapProvider>
  );
};
```

## Examples

See [examples](/examples) folder in this repository.