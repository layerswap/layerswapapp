import { FC, useEffect } from 'react'
import { useConnect } from 'wagmi'
import { LayerswapProvider, LayerSwapSettings, Swap, ThemeData } from '@layerswap/widget'

type PageComponentProps = {
    settings: LayerSwapSettings | undefined,
}

const LayerswapWidget: FC<PageComponentProps> = ({ settings }) => {
    const { connect, connectors } = useConnect()

    useEffect(() => {
        if (connectors && connectors.length > 0) {
            connect({ connector: connectors[0] })
        }
    }, [])

    return (
        <LayerswapProvider
            apiKey={process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY as string}
            integrator='test'
            settings={settings}
            themeData={themeData}
        >
            <Swap
                featuredNetwork={{
                    initialDirection: 'to',
                    network: 'CELO_MAINNET',
                    oppositeDirectionOverrides: 'onlyExchanges'
                }}
            />
        </LayerswapProvider>
    )
}

const themeData: ThemeData = {
    placeholderText: "171, 181, 209",
    actionButtonText: "254, 255, 254",
    buttonTextColor: "254, 255, 254",
    logo: "7, 149, 95",
    borderRadius: "small",
    primary: {
        DEFAULT: "7, 149, 95",
        '50': '217, 244, 232',
        '100': '185, 236, 209',
        '200': '145, 221, 175',
        '300': '102, 199, 138',
        '400': '61, 172, 100',
        '500': '7, 149, 95',
        '600': '6, 121, 77',
        '700': '5, 97, 62',
        '800': '4, 75, 48',
        '900': '3, 58, 37',
        text: "254, 255, 254",
        textMuted: "171, 181, 209",
    },
    secondary: {
        DEFAULT: "42, 44, 52",
        '50': "224, 225, 228",
        '100': "205, 206, 210",
        '200': "176, 177, 182",
        '300': "147, 148, 153",
        '400': "117, 119, 125",
        '500': "88, 90, 97",
        '600': "70, 72, 79",
        '700': "42, 44, 52",
        '800': "32, 34, 40",
        '900': "23, 24, 29",
        text: "254, 255, 254",
    }
}
export default LayerswapWidget