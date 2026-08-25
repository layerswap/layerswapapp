import { useSelectedAccount } from '@/context/swapAccounts'
import { isGaslessCapableRoute } from '@/helpers/gasless'
import { SwapBasicData } from '@/lib/apiClients/layerSwapApiClient'
import { useGaslessPreferenceStore } from '@/stores/gaslessPreferenceStore'
import useWallet from './useWallet'

export function useIsGaslessActive(swapData: SwapBasicData | undefined): boolean {
    const gaslessEnabled = useGaslessPreferenceStore(state => state.gaslessEnabled)
    const selectedSourceAccount = useSelectedAccount('from', swapData?.source_network?.name)
    const { wallets } = useWallet(swapData?.source_network, 'asSource')
    const sourceWallet = wallets.find(wallet => wallet.id === selectedSourceAccount?.id)

    return gaslessEnabled && isGaslessCapableRoute({
        depositMethod: swapData?.use_deposit_address ? 'deposit_address' : 'wallet',
        supportsGaslessDeposit: swapData?.source_token?.supports_gasless_deposit,
        sourceIsSupported: !!sourceWallet,
        sourceAddress: selectedSourceAccount?.address,
    })
}
