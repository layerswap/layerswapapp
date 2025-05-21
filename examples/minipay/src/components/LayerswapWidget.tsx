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
            apiKey='sHc3vgu/I7xj4/JPrfCV2LNOWd34g1AUMemlGh4owsVDcvnbXSvrzUp1UvQq3LR2UcWLRwk+EoowKDPP32j6jw'
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