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
import SpinIcon from '../../icons/spinIcon';

const CodeStep: FC = () => {

    const [code, setCode] = useState("")
    // const { nextStep } = useWizardState();
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const { getUserExchanges } = useUserExchangeDataUpdate()
    const { swapFormData } = useSwapDataState()
    const { goToStep } = useFormWizardaUpdate<FormWizardSteps>()
    const [loadingResend, setLoadingResend] = useState(false)

    const { email } = useAuthState();
    const { updateAuthData } = useAuthDataUpdate()
    const handleInputChange = (e) => {
        setCode(e?.target?.value)
    }

    const verifyCode = useCallback(async () => {
        try {
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

        }
        catch (error) {
            if (error.response?.data?.error_description) {
                const message = error.response.data.error_description
                setError(message)
            }
            else {
                setError(error.message)
            }
        }
        finally {
            setLoading(false)
        }

    }, [email, code, swapFormData])

    const handleResendCode = useCallback(async () => {
        setLoadingResend(true)
        try {
            setError("")
            const apiClient = new LayerSwapAuthApiClient();
            const res = await apiClient.getCodeAsync(email)
        }
        catch (error) {
            if (error.response?.data?.errors?.length > 0) {
                const message = error.response.data.errors.map(e => e.message).join(", ")
                setError(message)
            }
            else {
                setError(error.message)
            }
        }
        finally {
            setLoadingResend(false)
        }
    }, [email])
    return (
        <>
            <div className="w-full px-3 md:px-8 py-12 grid grid-flow-row min-h-[440px] text-pink-primary-300">
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
                    <label htmlFor="amount" className="block font-normal text-sm">
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
                             placeholder:text-2xl placeholder:h-12 placeholder:text-center tracking-widest placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 border-gray-600 w-full font-semibold rounded-md placeholder-gray-400"
                            onKeyPress={e => {
                                isNaN(Number(e.key)) && e.preventDefault()
                            }}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="flex items-center">
                        {
                            loadingResend ?
                                <span className="flex items-center pl-3">
                                    <SpinIcon className="animate-spin h-5 w-5 mr-3" />
                                </span>
                                :
                                <label className="block font-lighter leading-6 text-center">
                                    Didn't receive it?
                                    <button className="pl-1 font-lighter strong-highlight hightlight-animation highlight-link hover:cursor-pointer" onClick={handleResendCode}>
                                        Resend again
                                    </button>
                                </label>
                        }

                    </div>
                </div>

                <div className='mt-auto'>
                    <div className="text-white text-sm mt-auto mb-4 mt-4">
                        <p className='mb-5 text-pink-primary-300'>
                            By clicking continue to create an account, you agree to Layerswap's <Link href="/blog/guide/Terms_of_Service"><a className='strong-highlight hightlight-animation text-base'> Terms of Conditions</a></Link> and <Link href="/blog/guide/Terms_of_Service"><a className='strong-highlight hightlight-animation text-base'>Privacy Policy</a></Link>
                        </p>
                        <SubmitButton isDisabled={code?.length != 6 || loading} icon="" isSubmitting={loading} onClick={verifyCode}>
                            Confirm
                        </SubmitButton>
                    </div>
                </div>

            </div>

        </>
    )
}

export default CodeStep;