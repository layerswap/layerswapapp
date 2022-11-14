import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useState } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../../../context/formWizardProvider';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import { SwapCreateStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import toast from 'react-hot-toast';
import AddressDetails from '../../../DisclosureComponents/AddressDetails';
import NetworkSettings from '../../../../lib/NetworkSettings';
import WarningMessage from '../../../WarningMessage';
import SwapConfirmMainData from '../../../Common/SwapConfirmMainData';
import { ApiError, KnownwErrorCode } from '../../../../Models/ApiError';
import Widget from '../../Widget';
import LayerSwapApiClient from '../../../../lib/layerSwapApiClient';
import useSWR from 'swr';
import { ApiResponse } from '../../../../Models/ApiResponse';

const OffRampSwapConfirmationStep: FC = () => {
    const { swapFormData, swap } = useSwapDataState()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { createAndProcessSwap, processPayment, updateSwapFormData } = useSwapDataUpdate()
    const { goToStep } = useFormWizardaUpdate<SwapCreateStep>()
    const { network } = swapFormData || {}
    const router = useRouter();
    const { exchange, destination_address, currency } = swapFormData || {}

    const layerswapApiClient = new LayerSwapApiClient()
    const depositad_address_endpoint = `${LayerSwapApiClient.apiBaseEndpoint}/api/exchange_accounts/${exchange?.baseObject?.internal_name}/deposit_address/${currency?.baseObject?.asset?.toUpperCase()}`
    const { data: deposite_address } = useSWR<ApiResponse<string>>((exchange && !destination_address) ? depositad_address_endpoint : null, layerswapApiClient.fetcher)

    useEffect(() => {
        if (deposite_address?.data)
            updateSwapFormData((old) => ({ ...old, destination_address: deposite_address.data }))
    }, [deposite_address])

    const handleSubmit = useCallback(async () => {
        setIsSubmitting(true)
        let nextStep: SwapCreateStep;
        try {
            if (!swap) {
                const swapId = await createAndProcessSwap();
                await router.push(`/${swapId}`)
            }
            else {
                const swapId = swap.id
                await processPayment(swapId)
                await router.push(`/${swapId}`)
            }
        }
        catch (error) {
            const data: ApiError = error?.response?.data?.error
            if (!data) {
                toast.error(error.message)
                return
            }
            if (data.code === KnownwErrorCode.INVALID_CREDENTIALS) {
                nextStep = SwapCreateStep.OffRampOAuth
            }
            else
                toast.error(data?.message)
        }
        setIsSubmitting(false)
        if (nextStep)
            goToStep(nextStep)
    }, [network, swap, createAndProcessSwap])

    return (
        <Widget>
            <Widget.Content>
                <SwapConfirmMainData>
                    {
                        NetworkSettings.KnownSettings[network?.baseObject?.internal_name]?.ConfirmationWarningMessage &&
                        <WarningMessage className='mb-4'>
                            <p className='font-normal text-sm text-darkblue-600'>
                                {NetworkSettings.KnownSettings[network?.baseObject?.internal_name]?.ConfirmationWarningMessage}
                            </p>
                        </WarningMessage>
                    }
                    <AddressDetails canEditAddress={false} />
                </SwapConfirmMainData>
            </Widget.Content>
            <Widget.Footer>
                <SubmitButton type='submit' isDisabled={false} isSubmitting={isSubmitting} onClick={handleSubmit}>
                    Confirm
                </SubmitButton>
            </Widget.Footer>
        </Widget>
    )
}

export default OffRampSwapConfirmationStep;
