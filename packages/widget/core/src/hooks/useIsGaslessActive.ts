import { useSelectedAccount } from '@/context/swapAccounts'
import { isGaslessCapableRoute } from '@/helpers/gasless'
import { SwapBasicData } from '@/lib/apiClients/layerSwapApiClient'
import { useGaslessPreferenceStore } from '@/stores/gaslessPreferenceStore'
import useWallet from './useWallet'
import { useMemo } from 'react'

export function useIsGaslessActive(swapData: SwapBasicData | undefined): boolean {
    const gaslessEnabled = useGaslessPreferenceStore(state => state.gaslessEnabled)
    const selectedSourceAccount = useSelectedAccount('from', swapData?.source_network?.name)
    const { wallets } = useWallet(swapData?.source_network, 'asSource')
    const sourceWalletSupported = useMemo(() => {
        return wallets.find(wallet => wallet.id === selectedSourceAccount?.id)?.asSourceSupportedNetworks?.some(
            network => network === swapData?.source_network?.name,
        )
    }, [wallets, selectedSourceAccount, swapData?.source_network?.name])

    return gaslessEnabled && isGaslessCapableRoute({
        depositMethod: swapData?.use_deposit_address ? 'deposit_address' : 'wallet',
        supportsGaslessDeposit: swapData?.source_token?.supports_gasless_deposit,
        sourceIsSupported: !!sourceWalletSupported,
        sourceAddress: selectedSourceAccount?.address,
    })
}
