# Layerswap Widget + RainbowKit + Next.js Example

This example demonstrates how to integrate the [Layerswap Widget](https://github.com/layerswap/layerswapapp) with [RainbowKit](https://rainbowkit.com) and [wagmi](https://wagmi.sh) in a [Next.js](https://nextjs.org/) application.

## Getting started

### Prerequisites

- Node.js >= 20.9.0
- Yarn 1.22.22 or later

### Installation

Install dependencies:

```bash
yarn install
```

### Environment Setup

Create a `.env.local` file in the root directory and add your API keys:

```env
NEXT_PUBLIC_API_KEY = YOUR_API_KEY
```

YOUR_API_KEY is used for accessing the widget. You can generate and input the API key from the [Partner Dashboard](https://docs.layerswap.io/api-reference/api-keys)

The example uses a default WalletConnect projectId. For production, you should get your own projectId from [WalletConnect Cloud](https://cloud.walletconnect.com). Update it in [src/components/PageComponent.tsx:15](src/components/PageComponent.tsx#L15).

### Running the Development Server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the widget.
