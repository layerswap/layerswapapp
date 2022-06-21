import { CheckIcon, ExclamationIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useCallback, useState } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { useSwapDataState } from '../../../context/swap';
import { useUserExchangeDataUpdate } from '../../../context/userExchange';
import { useWizardState } from '../../../context/wizard';
import { useInterval } from '../../../hooks/useInyterval';
import { parseJwt } from '../../../lib/jwtParser';
import TokenService from '../../../lib/TokenService';
import { FormWizardSteps, SwapWizardSteps } from '../../../Models/Wizard';
import SubmitButton from '../../buttons/submitButton';

const AccountConnectStep: FC = () => {
    const [localError, setLocalError] = useState("")
    const { swapFormData } = useSwapDataState()
    const { oauth_redirect_url } = swapFormData?.exchange?.baseObject || {}
    const { goToStep } = useFormWizardaUpdate<FormWizardSteps>()
    const { currentStep, error: wizardError } = useFormWizardState<FormWizardSteps>()
    const { getUserExchanges } = useUserExchangeDataUpdate()

    useInterval(async () => {
        if (currentStep === "ExchangeOAuth") {
            const { access_token } = TokenService.getAuthData() || {};
            if (!access_token) {
                await goToStep("Email")
                return;
            }
            const exchanges = await (await getUserExchanges(access_token))?.data
            const exchangeIsEnabled = exchanges?.some(e => e.exchange === swapFormData?.exchange?.id && e.is_enabled)
            if (!swapFormData?.exchange?.baseObject?.authorization_flow || swapFormData?.exchange?.baseObject?.authorization_flow == "none" || exchangeIsEnabled)
                goToStep("SwapConfirmation")
        }
    }, [currentStep], 2000)

    const handleConnect = useCallback(() => {
        try {
            const access_token = TokenService.getAuthData()?.access_token
            if (!access_token)
                goToStep("Email")
            const { sub } = parseJwt(access_token) || {}
            window.open(oauth_redirect_url + sub, '_blank', 'width=420,height=720')
        }
        catch (e) {
            setLocalError(e.message)
        }
    }, [oauth_redirect_url])

    const minimalAuthorizeAmount = Math.round(swapFormData?.currency?.baseObject?.price_in_usdt * Number(swapFormData?.amount) + 5)
    const error = localError + wizardError
    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                {
                    error &&
                    <div className="bg-[#3d1341] border-l-4 border-[#f7008e] p-4 mb-5">
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
                <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2.5 stroke-pink-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <label className="block text-lg font-medium leading-6 text-white"> Important </label>
                </div>
                <div className="flex items-center mt-2">
                    <label className="block text-lg font-lighter leading-6 text-light-blue"> Make sure to authorize at least {minimalAuthorizeAmount}$. Follow this <Link key="userGuide" href="/userguide"><a className="font-lighter text-darkblue underline hover:cursor-pointer">Step by step guide</a></Link></label>
                </div>
                <div className="flex items-center mt-12 md:mt-5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2.5 stroke-pink-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <label className="block text-lg font-lighter leading-6 text-white"> Note </label>
                </div>
                <div className="flex items-center mt-2">
                    <label className="block text-lg font-lighter leading-6 text-light-blue"> Even after authorization Bransfer can't initiate a withdrawal without your explicit confirmation.</label>
                </div>
                <div>
                    <label className="block font-normal text-light-blue text-sm mt-12">
                        You will leave Bransfer and be securely redirected to Conibase authorization page.
                    </label>
                </div>
                <div className="text-white text-sm mt-3">
                    <SubmitButton isDisabled={false} icon="" isSubmitting={false} onClick={handleConnect}>
                        Confirm
                    </SubmitButton>
                </div>
            </div>

        </>
    )
}

export default AccountConnectStep;