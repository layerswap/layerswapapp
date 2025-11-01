import { FC } from "react";
import { Swap, LayerswapProvider, LayerSwapSettings, ThemeData } from '@layerswap/widget'
import { StarknetWalletConnectors } from "@dynamic-labs/starknet";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EVMProvider } from "@layerswap/wallet-evm"
import { StarknetProvider } from "@layerswap/wallet-starknet"
import { SVMProvider } from "@layerswap/wallet-svm"
import { BitcoinProvider } from "@layerswap/wallet-bitcoin"
import useCustomStarknet from "../hooks/useCustomStarknet";
import { WalletProvider } from "@layerswap/widget/types";
import "@layerswap/widget/index.css"

const PageComponent: FC<{ settings?: LayerSwapSettings }> = ({ settings }) => {

    const starknetProvider: WalletProvider = {
        ...StarknetProvider,
        walletConnectionProvider: useCustomStarknet
    }

    return (
        <DynamicContextProvider
            settings={{
                // Find your environment id at https://app.dynamic.xyz/dashboard/developer
                environmentId: "63a881b4-4008-45d7-9697-4a9e743f51d9",
                walletConnectors: [StarknetWalletConnectors],
            }}
        >
            <div className="w-[600px] mx-auto flex flex-col justify-center place-self-center h- rounded-lg">
                <LayerswapProvider
                    config={{
                        settings,
                        theme: theme,
                        apiKey: 'm1jz5JMmndWbMmYLm5vcsHtpxQ35xGT2Z4xa+rp/i98GXVc1vhH7lvY0zbLMTdkD9BXw+HLUTku4H6VumEDogQ',
                        version: 'mainnet',
                        initialValues: {
                            toAsset: 'USDC',
                            lockTo: true,
                            lockAsset: true
                        },
                    }}
                    walletProviders={[EVMProvider, starknetProvider, SVMProvider, BitcoinProvider]}
                >
                    <Swap />
                </LayerswapProvider>
            </div>
        </DynamicContextProvider>
    )
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

export default PageComponent