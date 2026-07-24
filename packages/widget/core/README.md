
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
pnpm add @layerswap/widget zustand
```

**npm:**

```sh
npm install @layerswap/widget zustand
```

**yarn:**

```sh
yarn add @layerswap/widget zustand
```

- [**Zustand**](https://zustand.docs.pmnd.rs/getting-started/introduction) is a lightweight state management library for React applications.

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

## Examples

See [examples](/examples) folder in this repository.