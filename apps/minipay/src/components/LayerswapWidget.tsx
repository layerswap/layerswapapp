import { FC, useEffect } from 'react'
import { useConnect } from 'wagmi'
import { LayerswapProvider, LayerSwapSettings, Swap } from '@layerswap/widget'

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
            themeData={{
                borderRadius: 'small'
            }}
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

export default LayerswapWidget