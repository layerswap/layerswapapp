import { useRouter } from 'next/router';
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import { SwapCreateStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import toast from 'react-hot-toast';
import AddressDetails from '../../../DisclosureComponents/AddressDetails';
import NetworkSettings from '../../../../lib/NetworkSettings';
import WarningMessage from '../../../WarningMessage';
import SwapConfirmMainData from '../../../Common/SwapConfirmMainData';
import { ApiError, KnownwErrorCode } from '../../../../Models/ApiError';
import KnownInternalNames from '../../../../lib/knownIds';
import Widget from '../../Widget';
import LayerSwapApiClient from '../../../../lib/layerSwapApiClient';
import useSWR from 'swr';
import { ApiResponse } from '../../../../Models/ApiResponse';
import GuideLink from '../../../guideLink';
import { useQueryState } from '../../../../context/query';
import InternalApiClient from '../../../../lib/internalApiClient';
import { useSettingsState } from '../../../../context/settings';
import { AlertOctagon } from 'lucide-react';
import ToggleButton from '../../../buttons/toggleButton';
import { nameOf } from '../../../../lib/external/nameof';
import { FormikProps } from 'formik';
import { SwapConfirmationFormValues } from '../../../DTOs/SwapConfirmationFormValues';
import { Exchange } from '../../../../Models/Exchange';
import { Layer } from '../../../../Models/Layer';


const OffRampSwapConfirmationStep: FC = () => {
    const { swapFormData, swap, addressConfirmed } = useSwapDataState()
    const [loading, setLoading] = useState(false)
    const { createAndProcessSwap, updateSwapFormData, setAddressConfirmed } = useSwapDataUpdate()
    const { goToStep, setError } = useFormWizardaUpdate<SwapCreateStep>()
    const router = useRouter();
    const { from, destination_address, currency, to } = swapFormData || {}
    const query = useQueryState();
    const settings = useSettingsState();

    const formikRef = useRef<FormikProps<SwapConfirmationFormValues>>(null);
    const currentValues = formikRef?.current?.values;
    const nameOfRightWallet = nameOf(currentValues, (r) => r.RightWallet)

    const layerswapApiClient = new LayerSwapApiClient()
    const depositad_address_endpoint = `/exchange_accounts/${to?.internal_name}/deposit_address/${currency?.asset?.toUpperCase()}`
    const { data: deposite_address } = useSWR<ApiResponse<string>>((to && !destination_address) ? depositad_address_endpoint : null, layerswapApiClient.fetcher)

    const currentNetwork = swapFormData?.from;
    const currentExchange = swapFormData?.to as Layer & { isExchange: true };
    const currentCurrency = swapFormData?.currency;

    useEffect(() => {
        if (deposite_address?.data)
            updateSwapFormData((old) => ({ ...old, destination_address: deposite_address.data }))
    }, [deposite_address])


    const handleToggleChange = (value: boolean) => {
        setAddressConfirmed(value)
    }

    const handleSubmit = useCallback(async () => {
        setLoading(true)
        let nextStep: SwapCreateStep;
        try {
            if (!swap) {
                if (query.addressSource === "imxMarketplace" && settings.validSignatureisPresent) {
                    try {
                        const account = await layerswapApiClient.GetWhitelistedAddress(swapFormData?.to?.internal_name, query.destAddress)
                    }
                    catch (e) {
                        //TODO handle account not found
                        const internalApiClient = new InternalApiClient()
                        await internalApiClient.VerifyWallet(window.location.search);
                    }
                }
                const swapId = await createAndProcessSwap();
                await router.push(`/swap/${swapId}`)
            }
            else {
                const swapId = swap.id
                // await processPayment(swapId)
                await router.push(`/swap/${swapId}`)
            }
        }
        catch (error) {
            const data: ApiError = error?.response?.data?.error
            if (data?.code === KnownwErrorCode.INVALID_CREDENTIALS) {
                nextStep = SwapCreateStep.OffRampOAuth
            }
            else if (data?.code === KnownwErrorCode.NETWORK_ACCOUNT_ALREADY_EXISTS) {
                goToStep(SwapCreateStep.Error)
                setError({ Code: data.code, Step: SwapCreateStep.Confirm })
            }
            else if (data?.message)
                toast.error(data?.message)
            else if (error.message)
                toast.error(error.message)
            else
                toast.error(error)
        }
        setLoading(false)
        if (nextStep)
            goToStep(nextStep)
    }, [from, swap, createAndProcessSwap, settings, query, destination_address])

    return (
        <Widget>
            <Widget.Content>
                <SwapConfirmMainData>
                    {
                        NetworkSettings.KnownSettings[from?.internal_name]?.ConfirmationWarningMessage &&
                        <WarningMessage className='mb-4'>
                            <span>{NetworkSettings.KnownSettings[from?.internal_name]?.ConfirmationWarningMessage}.</span>
                            <p>
                                {
                                    from?.internal_name == KnownInternalNames.Networks.LoopringMainnet &&
                                    <GuideLink userGuideUrl='https://docs.layerswap.io/user-docs/using-gamestop-wallet-to-transfer-to-cex' text='Learn how'  />
                                }
                            </p>
                        </WarningMessage>
                    }
                    <AddressDetails canEditAddress={true} />
                </SwapConfirmMainData>
                {
                    currentExchange?.assets.filter(ec => ec.asset === currentCurrency.asset)?.some(ce => ce.network_internal_name === currentNetwork.internal_name) &&
                    <WarningMessage messageType='informing'>
                        <span>You might be able transfer {currentCurrency.asset} from {currentNetwork.display_name} to {currentExchange.display_name} directly</span>
                    </WarningMessage>
                }
            </Widget.Content>
            <Widget.Footer>
                <div className="text-white text-sm">
                    <div className="mx-auto w-full rounded-lg font-normal">
                        <div className='flex justify-between mb-4 md:mb-8'>
                            <div className='flex items-center text-xs md:text-sm font-medium'>
                                <AlertOctagon className='h-6 w-6 mr-2' />
                                I am the owner of this address
                            </div>
                            <div className='flex items-center space-x-4'>
                                <ToggleButton name={nameOfRightWallet} onChange={handleToggleChange} value={addressConfirmed} />
                            </div>
                        </div>
                    </div>
                    <SubmitButton className='plausible-event-name=Swap+details+confirmed' type='submit' isDisabled={!addressConfirmed} isSubmitting={loading} onClick={handleSubmit}>
                        Confirm
                    </SubmitButton>
                </div>
            </Widget.Footer>
        </Widget>
    )
}

export default OffRampSwapConfirmationStep;
