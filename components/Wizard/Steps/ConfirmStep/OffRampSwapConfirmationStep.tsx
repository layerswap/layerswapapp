import { Transition } from '@headlessui/react';
import { ArrowRightIcon, PencilAltIcon, XIcon } from '@heroicons/react/outline';
import { ExclamationIcon } from '@heroicons/react/outline';
import { useRouter } from 'next/router';
import { FC, Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../../../context/formWizardProvider';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import { SwapCreateStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import Image from 'next/image'
import toast from 'react-hot-toast';
import { CalculateReceiveAmount } from '../../../../lib/fees';
import ToggleButton from '../../../buttons/toggleButton';
import { isValidAddress } from '../../../../lib/addressValidator';
import AddressDetails from '../../../DisclosureComponents/AddressDetails';
import { classNames } from '../../../utils/classNames';
import TokenService from '../../../../lib/TokenService';
import { BransferApiClient } from '../../../../lib/bransferApiClients';
import { CreateSwapParams } from '../../../../lib/layerSwapApiClient';
import NumericInput from '../../../Input/NumericInput';
import NetworkSettings from '../../../../lib/NetworkSettings';
import WarningMessage from '../../../WarningMessage';
import { Form, Formik, FormikErrors, FormikProps } from 'formik';
import { nameOf } from '../../../../lib/external/nameof';
import SwapConfirmMainData from '../../../Common/SwapConfirmMainData';

const OffRampSwapConfirmationStep: FC = () => {
    const { swapFormData, swap } = useSwapDataState()
    const { currentStepName } = useFormWizardState<SwapCreateStep>()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { createSwap, processPayment, updateSwapFormData, getSwap } = useSwapDataUpdate()
    const { goToStep } = useFormWizardaUpdate<SwapCreateStep>()
    const { network } = swapFormData || {}
    const router = useRouter();

    useEffect(() => {
        (async () => {
            if (currentStepName !== SwapCreateStep.Confirm)
                return true

            const authData = TokenService.getAuthData();
            if (!authData) {
                goToStep(SwapCreateStep.Email)
                return;
            }
            const bransferApiClient = new BransferApiClient()
            const response = await bransferApiClient.GetExchangeDepositAddress(swapFormData?.exchange?.baseObject?.internal_name, swapFormData.currency?.baseObject?.asset?.toUpperCase(), authData.access_token)
            updateSwapFormData((old) => ({ ...old, destination_address: response.data }))
        })()
    }, [currentStepName])

    const minimalAuthorizeAmount = Math.round(swapFormData?.currency?.baseObject?.price_in_usdt * Number(swapFormData?.amount) + 5)
    const transferAmount = `${swapFormData?.amount} ${swapFormData?.currency?.name}`

    const handleSubmit = useCallback(async () => {
        setIsSubmitting(true)
        try {
            const data: CreateSwapParams = {
                Amount: Number(swapFormData.amount),
                Exchange: swapFormData.exchange?.id,
                Network: swapFormData.network.id,
                currency: swapFormData.currency.baseObject.asset,
                destination_address: swapFormData.destination_address,
                to_exchange: true
            }
            const _swap = swap?.data?.id ? await getSwap(swap.data.id) : await createSwap(data)
            const { payment } = _swap.data
            if (payment?.status === 'created')
                await processPayment(_swap)
            ///TODO grdon code please refactor
            else if (payment?.status === 'closed') {
                const newSwap = await createSwap(data)
                await processPayment(newSwap)
                router.push(`/${newSwap.data.id}`)
                return
            }
            router.push(`/${_swap.data.id}`)
        }
        catch (error) {
            ///TODO newline may not work, will not defenitaly fix this
            const errorMessage = error.response?.data?.errors?.length > 0 ? error.response.data.errors.map(e => e.message).join(', ') : (error?.response?.data?.error?.message || error?.response?.data?.message || error.message)

            if (error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "Require Reauthorization")) {
                goToStep(SwapCreateStep.OAuth)
                toast.error(`You have not authorized minimum amount, for transfering ${transferAmount} please authirize at least ${minimalAuthorizeAmount}$`)
            }
            else if (error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "You don't have that much.")) {
                toast.error(`${swapFormData.network.name} error: You don't have that much.`)
            }
            else {
                toast.error(errorMessage)
            }
        }
        finally {
            setIsSubmitting(false)
        }
    }, [swapFormData, swap, transferAmount])


    return (
        <>
            <div className='px-6 md:px-8 h-full flex flex-col justify-between'>
                <SwapConfirmMainData>
                    {
                        NetworkSettings.KnownSettings[network?.baseObject?.id]?.ConfirmationWarningMessage &&
                        <WarningMessage className='mb-4'>
                            <p className='font-normal text-sm text-darkblue-600'>
                                {NetworkSettings.KnownSettings[network?.baseObject?.id]?.ConfirmationWarningMessage}
                            </p>
                        </WarningMessage>
                    }
                    <AddressDetails canEditAddress={false} />
                </SwapConfirmMainData>
                <SubmitButton type='submit' isDisabled={false} icon="" isSubmitting={isSubmitting} onClick={handleSubmit}>
                    Confirm
                </SubmitButton>
            </div>
        </>
    )
}

export default OffRampSwapConfirmationStep;
