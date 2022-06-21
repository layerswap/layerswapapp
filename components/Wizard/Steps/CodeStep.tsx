import { CheckIcon, ExclamationIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useCallback, useState } from 'react'
import { useAuthDataUpdate, useAuthState } from '../../../context/auth';
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { useSwapDataState } from '../../../context/swap';
import { useUserExchangeDataUpdate } from '../../../context/userExchange';
import { useWizardState } from '../../../context/wizard';
import LayerSwapAuthApiClient from '../../../lib/userAuthApiClient';
import { ExchangeAuthorizationSteps, FormWizardSteps } from '../../../Models/Wizard';
import SubmitButton from '../../buttons/submitButton';

const CodeStep: FC = () => {

    const [code, setCode] = useState("")
    // const { nextStep } = useWizardState();
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const { getUserExchanges } = useUserExchangeDataUpdate()
    const { swapFormData } = useSwapDataState()
    const { goToStep } = useFormWizardaUpdate<FormWizardSteps>()

    const { email } = useAuthState();
    const { updateAuthData } = useAuthDataUpdate()
    const handleInputChange = (e) => {
        setCode(e?.target?.value)
    }

    const verifyCode = useCallback(async () => {
        setLoading(true)
        var apiClient = new LayerSwapAuthApiClient();
        const res = await apiClient.connectAsync(email, code)
        await updateAuthData(res)
        setLoading(false)
        const exchanges = await (await getUserExchanges(res.access_token))?.data
        const exchangeIsEnabled = exchanges?.some(e => e.exchange === swapFormData?.exchange?.id && e.is_enabled)
        if (!swapFormData?.exchange?.baseObject?.authorization_flow || swapFormData?.exchange?.baseObject?.authorization_flow === "none" || exchangeIsEnabled)
            goToStep("SwapConfirmation")
        else
            goToStep(ExchangeAuthorizationSteps[swapFormData?.exchange?.baseObject?.authorization_flow])
    }, [email, code, swapFormData])

    const handleResendCode = useCallback(async () => {
        try {
            const apiClient = new LayerSwapAuthApiClient();
            const res = await apiClient.getCodeAsync(email)
        }
        catch (e) {
            setError(e.message)
            console.log(e)
        }
        finally {
            setLoading(false)
        }
    }, [email])

    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                {
                    error &&
                    <div className="bg-[#3d1341] border-l-4 border-[#f7008e] p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <ExclamationIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-light-blue">
                                    {error}
                                </p>
                            </div>
                        </div>
                    </div>
                }
                <div>
                    <label htmlFor="amount" className="block font-normal text-light-blue text-sm">
                        Your Email Code
                    </label>
                    <div className="relative rounded-md shadow-sm mt-2 mb-4">
                        <input
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="XXXXXX"
                            autoCorrect="off"
                            type="text"
                            maxLength={6}
                            name="Code"
                            id="Code"
                            className="h-12 text-2xl pl-5 focus:ring-pink-primary text-center focus:border-pink-primary border-darkblue-100 block
                            placeholder:text-light-blue placeholder:text-2xl placeholder:h-12 placeholder:text-center tracking-widest placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 border-gray-600 w-full font-semibold rounded-md placeholder-gray-400"
                            onKeyPress={e => {
                                isNaN(Number(e.key)) && e.preventDefault()
                            }}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>
                <div className="text-white text-sm mt-auto mb-4 mt-4">
                    <SubmitButton isDisabled={code?.length != 6 || loading} icon="" isSubmitting={loading} onClick={verifyCode}>
                        Confirm
                    </SubmitButton>
                </div>
                <div className="flex items-center">
                    <label className="block text-base font-lighter leading-6 text-light-blue"> Did not receive the verification?  <button onClick={handleResendCode}><a className="font-lighter text-darkblue underline hover:cursor-pointer">Resend again</a></button></label>
                </div>
            </div>

        </>
    )
}

export default CodeStep;