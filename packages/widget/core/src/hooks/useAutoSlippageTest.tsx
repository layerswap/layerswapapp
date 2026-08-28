import { useMemo } from 'react'
import useSWR from 'swr'
import LayerSwapApiClient, { Quote } from '../lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '../Models/ApiResponse'
import { buildQuoteUrl, validDestinationAddress } from './useFee'
import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import { wantsFrontendSwap } from '@/helpers/swapFlow'
import { useGaslessPreferenceStore } from '@/stores/gaslessPreferenceStore'
import { useSelectedAccount } from '@/context/swapAccounts'
import { isGaslessCapableRoute } from '@/helpers/gasless'

type AutoSlippageTestProps = {
    values: SwapFormValues
    shouldTest: boolean
}
const apiClient = new LayerSwapApiClient()

export function useAutoSlippageTest({ values, shouldTest }: AutoSlippageTestProps) {

    const gaslessEnabled = useGaslessPreferenceStore(state => state.gaslessEnabled)
    const selectedSourceAccount = useSelectedAccount('from', values.from?.name)
    const useGasless = gaslessEnabled && isGaslessCapableRoute({
        depositMethod: values.depositMethod,
        supportsGaslessDeposit: values.fromAsset?.supports_gasless_deposit,
        sourceTokenContract: values.fromAsset?.contract,
        gaslessStandard: values.fromAsset?.gasless_standard,
        sourceIsSupported: !!selectedSourceAccount?.walletAsSourceSupportedNetworks?.includes(values.from?.name ?? ''),
        sourceAddress: selectedSourceAccount?.address,
    })

    const validatedDestinationAddress = useMemo(
        () => validDestinationAddress(values.destination_address, values.to),
        [values.destination_address, values.to],
    )

    const autoSlippageTestURL = shouldTest
        ? buildQuoteUrl({
            sourceNetwork: values.from?.name ?? '',
            sourceToken: values.fromAsset?.symbol ?? '',
            destinationNetwork: values.to?.name ?? '',
            destinationToken: values.toAsset?.symbol ?? '',
            amount: values.amount ?? '',
            refuel: !!values.refuel,
            useDepositAddress: values.depositMethod !== 'wallet',
            useFrontendSwap: wantsFrontendSwap({
                depositMethod: values.depositMethod,
                sourceNetwork: values.from?.name,
                destinationNetwork: values.to?.name,
            }),
            useGasless,
            destinationAddress: validatedDestinationAddress,
        })
        : null

    const { data, isLoading, error } = useSWR<ApiResponse<Quote>>(
        autoSlippageTestURL,
        apiClient.fetcher,
        {
            dedupingInterval: 10000,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            shouldRetryOnError: false,
            errorRetryCount: 0,
            onError: (err) => {
                console.debug('Auto slippage test failed:', err);
            }
        }
    )

    return {
        autoSlippageWouldWork: !error && !!data?.data,
        isTestingAutoSlippage: isLoading,
    }
}
