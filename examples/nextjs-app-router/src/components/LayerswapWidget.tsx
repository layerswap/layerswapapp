"use client";
import { useState } from "react";
import { LayerswapProvider, Swap, DepositComponent, LayerSwapSettings } from '@layerswap/widget';
import { getDefaultProviders } from "@layerswap/wallets";

type WidgetType = "swap" | "deposit";

export function LayerswapWidget({ settings }: { settings?: LayerSwapSettings }) {
  const [widgetType, setWidgetType] = useState<WidgetType>("swap");
  const walletConnect = {
    projectId: '821ab14954640abd9a7974a70f74bc6c',
    name: 'Layerswap Example',
    description: 'Layerswap Example',
    url: 'https://layerswap.io/app/',
    icons: ['https://layerswap.io/app/symbol.png']
  }
  const walletProviders = getDefaultProviders({
    walletConnect,
    ton: {
      tonApiKey: "Replace with your own TON API key",
      manifestUrl: 'https://layerswap.io/app/tonconnect-manifest.json',
    }
  })
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-5">
      <h1 className="text-2xl font-bold text-white">
        Layerswap Widget App Router Example
      </h1>
      <p className="mb-4 text-center text-gray-400 max-w-lg px-4">
        This example demonstrates the Layerswap widget integration using Next.js App Router. For information on all available widget configurations, please refer to{' '}
        <a
          href="https://docs.layerswap.io/introduction"
          target="_blank"
          rel="noopener noreferrer"
          className="text-pink-600 hover:no-underline underline"
        >
          our documentation
        </a>.
      </p>
      <WidgetSwitcher value={widgetType} onChange={setWidgetType} />
      <div className="w-full max-w-lg mx-auto h-full rounded-xl">
        <LayerswapProvider
          config={{
            settings,
            // apiKey: "Replace with your own API key",
            version: 'mainnet', //'mainnet' or 'testnet'
          }}
          walletProviders={walletProviders}
        >
          {widgetType === "swap" ? (
            <Swap />
          ) : (
            <DepositComponent
              destination={{ network: "ETHEREUM_MAINNET", tokens: ["ETH"] }}
              destinationAddress="0xB2029bbd8C1cBCC43c3A7b7fE3d118b0C57D7C31"
            />
          )}
        </LayerswapProvider>
      </div>
    </div>
  );
}

function WidgetSwitcher({
  value,
  onChange,
}: {
  value: WidgetType;
  onChange: (value: WidgetType) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 mb-4 rounded-lg bg-gray-800">
      {(["swap", "deposit"] as const).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={`rounded-md px-6 py-1.5 text-sm font-medium capitalize transition-colors duration-200 ${
            value === type ? "bg-pink-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );
}
