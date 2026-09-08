# Layerswap Widget + Dynamic + Next.js Example

This example demonstrates how to integrate the [Layerswap Widget](https://github.com/layerswap/layerswapapp) with [Dynamic](https://www.dynamic.xyz/) wallet connection library in a [Next.js](https://nextjs.org/) application.

## Getting started

### Prerequisites

- Node.js >= 20.9.0
- pnpm 10 or later

### Installation

Install dependencies:

```bash
pnpm install --ignore-workspace
```

This example is intentionally isolated from the parent pnpm workspace, so the
`--ignore-workspace` flag keeps its installation and lockfile local.

### Environment Setup

Create a `.env.local` file in the root directory and add your API keys:

```env
NEXT_PUBLIC_API_KEY = YOUR_API_KEY
```

YOUR_API_KEY is used for accessing the widget. You can generate and input the API key from the [Partner Dashboard](https://docs.layerswap.io/api-reference/api-keys)

You'll also need to configure your Dynamic environment ID in [components/PageComponent.tsx:24](components/PageComponent.tsx#L24). Get your environment ID from the [Dynamic Dashboard](https://app.dynamic.xyz/dashboard/developer).

### Running the Development Server

```bash
pnpm --ignore-workspace dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the widget.
