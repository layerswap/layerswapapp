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
            config={{
                apiKey: process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY as string,
                settings,
                theme: themeData,
                initialValues: {
                    to: 'CELO_MAINNET',
                    lockTo: false,
                }
            }}
        >
            <Swap />
        </LayerswapProvider>
    )
}

const themeData: ThemeData = {
    tertiary: '118, 128, 147',
    buttonTextColor: '254, 255, 254',
    logo: '7, 149, 95',
    borderRadius: 'small',
    warning: {
        Foreground: '255, 201, 74',
        Background: '47, 43, 29',
    },
    error: {
        Foreground: '255, 97, 97',
        Background: '46, 27, 27',
    },
    success: {
        Foreground: '89, 224, 125',
        Background: '14, 43, 22',
    },
    primary: {
        DEFAULT: '7, 149, 95',
        '100': '217, 244, 232',
        '200': '185, 236, 209',
        '300': '145, 221, 175',
        '400': '102, 199, 138',
        '500': '61, 172, 100',
        '600': '7, 149, 95',
        '700': '6, 121, 77',
        '800': '5, 97, 62',
        '900': '4, 75, 48',
        'text': '254, 255, 254',
    },
    secondary: {
        DEFAULT: '42, 44, 52',
        '100': '224, 225, 228',
        '200': '205, 206, 210',
        '300': '176, 177, 182',
        '400': '147, 148, 153',
        '500': '117, 119, 125',
        '600': '88, 90, 97',
        '700': '70, 72, 79',
        '800': '42, 44, 52',
        '900': '32, 34, 40',
        'text': '254, 255, 254',
    },
}
export default LayerswapWidget