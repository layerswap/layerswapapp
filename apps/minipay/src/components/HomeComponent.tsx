
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '../lib/configs/wagmi'
import LayerswapWidget from '@/components/LayerswapWidget'
import { LayerSwapSettings } from '@layerswap/widget'
import { usePersistedState } from '@/hooks/usePersistedState'
import LandingPage from './LandingPage'
import { useEffect, useState } from 'react'

const queryClient = new QueryClient()

export function HomeComponent({ settings }: { settings: LayerSwapSettings | undefined }) {
    return (
        <div className='max-w-xl mx-auto'>
            <WagmiProvider config={config}>
                <QueryClientProvider client={queryClient}>
                    <Component settings={settings} />
                </QueryClientProvider>
            </WagmiProvider>
        </div>

    )
}

const Component = ({ settings }: { settings: LayerSwapSettings | undefined }) => {
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])
    const [hasSeenIntroduction, setHasSeenIntroduction] = usePersistedState<boolean>(false, 'hasSeenIntroduction');


    if (!isClient) {
        return null
    }
    else if (!hasSeenIntroduction) {
        return <LandingPage onFinish={() => setHasSeenIntroduction(true)} />
    }
    return (
        <LayerswapWidget settings={settings} />
    )
}