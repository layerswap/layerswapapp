import { FC, useCallback, useEffect } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { SwapWithdrawalStep } from '../../../Models/Wizard';
import { useSettingsState } from '../../../context/settings';
import { GetSwapStatusStep } from '../../utils/SwapStatus';
import { useEffectOnce } from 'react-use';
import SubmitButton from '../../buttons/submitButton';

const ExternalPaymentStep: FC = () => {


    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const { data } = useSettingsState()
    const { exchanges } = data

    const { swap } = useSwapDataState()
    const { setInterval } = useSwapDataUpdate()

    useEffectOnce(() => {
        setInterval(2000)
        return () => setInterval(0)
    })
    
    const swapStatusStep = GetSwapStatusStep(swap)

    useEffect(() => {
        if (swapStatusStep && swapStatusStep !== SwapWithdrawalStep.ExternalPayment)
            goToStep(swapStatusStep)
    }, [swapStatusStep])

    const exchange = exchanges?.find(e => e.currencies.some(ec => ec.id === swap?.data?.exchange_currency_id))
    const exchange_name = exchange?.display_name || ' '

    const handleContinue = useCallback(async () => {
        const payment_url = swap?.data?.additonal_data?.payment_url
        window.open(payment_url, '_blank', 'width=420,height=720')
    }, [swap])

    return (
        <>
            <div className="w-full px-6 md:px-8 flex justify-between h-full flex-col">
                <div className=' space-y-10'>
                    <div className="flex items-center">
                        <label className="block text-lg font-medium text-white">Complete {exchange_name} transfer</label>
                    </div>
                    <div className="rounded-md border bg-darkblue-600 w-full grid grid-flow-row p-5 border-darkblue-100">
                        <ul className='list-disc my-2 pl-5 text-primary-text'>
                            <li>
                                By clicking Continue you will be directed to {exchange_name} to authorize and pay.
                            </li>
                            <li>
                                This page will automatically update after you complete the payment in {exchange_name}.
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="text-white text-lg ">
                    <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleContinue}>
                        Continue to {exchange_name}
                    </SubmitButton>
                </div>
            </div>
        </>
    )
}

export default ExternalPaymentStep;