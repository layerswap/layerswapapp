
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
pnpm add @layerswap/widget wagmi viem 
```

**npm:**

```sh
npm install @layerswap/widget wagmi viem
```

**yarn:**

```sh
yarn add @layerswap/widget wagmi viem
```

## Getting started with Layerswap Widget

Here is an example of a basic app using Layerswap Widget:

```tsx
import { LayerswapContext, Swap } from '@layerswap/widget';

export const WidgetPage = () => {
  return (
    <LayerswapContext>
      <Swap />
    </LayerswapContext>
  );
};
```

You can create your custom wallet provider if you want to use RainbowKit, Dynamic, etc.

```tsx
import { LayerswapContext, Swap, WalletHooksProvider } from '@layerswap/widget';
import useCustomEVM from "../hooks/useCustomEvm";

function CustomHooks ({ children }: { children: ReactNode }) {
    const customEvm = useCustomEVM()
    return <WalletHooksProvider overides={{ evm: customEvm }}>
        {children}
    </WalletHooksProvider>
}

export const WidgetPage = () => {

  return (
    <LayerswapContext>
      <CustomHooks>
        <Swap />
      <CustomHooks>
    </LayerswapContext>
  );
};
```

## Examples

See [examples](/examples) folder in this repository.