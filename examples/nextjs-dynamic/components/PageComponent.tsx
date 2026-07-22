import { FC, useMemo, useState } from "react";
import { Swap, DepositComponent, LayerswapProvider, LayerSwapSettings, ThemeData } from '@layerswap/widget'
import { StarknetWalletConnectors } from "@dynamic-labs/starknet";
import { DynamicContextProvider, DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { createEVMProvider } from "@layerswap/wallet-evm"
import { createStarknetProvider } from "@layerswap/wallet-starknet"
import { createSVMProvider } from "@layerswap/wallet-svm"
import { createBitcoinProvider } from "@layerswap/wallet-bitcoin"
import useCustomStarknet, { customStarknetAdapter } from "../hooks/useCustomStarknet";
import { useSettingsState } from "@layerswap/widget/internal";
import "@layerswap/widget/index.css"

const CustomStarknetHydrator: FC = () => {
    const { networks } = useSettingsState()
    return <customStarknetAdapter.Hydrator networks={networks} />
}
type WidgetType = "swap" | "deposit";

const PageComponent: FC<{ settings?: LayerSwapSettings }> = ({ settings }) => {
    const [widgetType, setWidgetType] = useState<WidgetType>("swap");

    // Memoize so the providers aren't recreated on every render (which would
    // tear down and re-init the wallet connections, disconnecting active wallets).
    const walletProviders = useMemo(() => [
        createStarknetProvider({
            customConnection: customStarknetAdapter.createConnection,
        }),
        createEVMProvider({
            walletConnectConfigs: walletConnect
        }),
        createSVMProvider({
            walletConnectConfigs: walletConnect
        }),
        createBitcoinProvider(),
    ], [])

    return (
        <DynamicContextProvider
            settings={{
                // Find your environment id at https://app.dynamic.xyz/dashboard/developer
                environmentId: "63a881b4-4008-45d7-9697-4a9e743f51d9",
                walletConnectors: [StarknetWalletConnectors],
                initialAuthenticationMode: 'connect-only'
            }}
            
        >
            <div className="h-screen flex flex-col items-center justify-center gap-4 w-full">
                
                {/* <h1 className="text-2xl font-bold text-white text-center">Layerswap Widget with Dynamic SDK Example</h1> */}
                {/* <p className="text-gray-400 max-w-lg px-4 text-center">This example demonstrates the Layerswap widget integration using Dynamic SDK. For information on all available widget configurations, please refer to{' '}
                    <a href="https://docs.layerswap.io/introduction" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:no-underline underline">our documentation</a>.
                </p> */}

                <div className="flex flex-col items-center justify-center gap-4">
                    <DynamicWidget />
                    <WidgetSwitcher value={widgetType} onChange={setWidgetType} />
                    <div className="w-[600px] mx-auto place-self-center rounded-lg">
                        <LayerswapProvider
                            config={{
                                settings,
                                theme: theme,
                                apiKey: 'm1jz5JMmndWbMmYLm5vcsHtpxQ35xGT2Z4xa+rp/i98GXVc1vhH7lvY0zbLMTdkD9BXw+HLUTku4H6VumEDogQ',
                                version: 'mainnet',
                                initialValues: {
                                    to: "STARKNET_MAINNET",
                                    toAsset: 'WBTC',
                                    lockTo: true
                                },
                            }}
                            walletProviders={walletProviders}
                        >
                            <CustomStarknetHydrator />
                            {widgetType === "swap" ? (
                                <Swap />
                            ) : (
                                <DepositComponent
                                    destination={{ network: "STARKNET_MAINNET", tokens: ["WBTC", "ETH"] }}
                                    destinationAddress="0x01837e50abe7B59bc3d0A57F09D80a0C34aAF1127b2c5E36b9E9b817030FF11b"
                                />
                            )}
                        </LayerswapProvider>
                    </div>
                </div>

            </div>
        </DynamicContextProvider>
    )
}

function WidgetSwitcher({
    value,
    onChange,
}: {
    value: WidgetType;
    onChange: (value: WidgetType) => void;
}) {
    return (
        <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-800">
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

const theme: ThemeData = {
    buttonTextColor: '25, 22, 25',
    tertiary: '71, 71, 82',
    primary: {
        DEFAULT: '55, 207, 211',
        100: '189, 239, 240',
        200: '155, 231, 233',
        300: '122, 223, 226',
        400: '88, 215, 218',
        500: '55, 207, 211',
        600: '38, 169, 172',
        700: '28, 124, 126',
        800: '18, 78, 80',
        900: '8, 33, 34',
        text: '248, 250, 252',
    },
    secondary: {
        DEFAULT: '29, 29, 33',
        100: '105, 105, 120',
        200: '86, 86, 98',
        300: '67, 67, 76',
        400: '48, 48, 55',
        500: '29, 29, 33',
        600: '22, 22, 25',
        700: '19, 19, 21',
        800: '0, 0, 0',
        900: '0, 0, 0',
        text: '128, 128, 143',
    }
}

const walletConnect = {
    projectId: '28168903b2d30c75e5f7f2d71902581b',
    name: 'Layerswap Example',
    description: 'Layerswap Example',
    url: 'https://layerswap.io/app/',
    icons: ['https://layerswap.io/app/symbol.png']
}

export default PageComponent