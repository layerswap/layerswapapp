# Layerswap Widget + Reown AppKit + Next.js Example

This example demonstrates how to integrate the [Layerswap Widget](https://github.com/layerswap/layerswapapp) with [Reown AppKit](https://reown.com/appkit) and [wagmi](https://wagmi.sh) in a [Next.js](https://nextjs.org/) application.

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

The example uses a default Reown projectId. For production, you should get your own projectId from [Reown Cloud](https://cloud.reown.com). Update it in [components/PageComponent.tsx:14](components/PageComponent.tsx#L14).

### Running the Development Server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the widget.
