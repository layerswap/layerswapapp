import { CheckIcon, ExclamationIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useCallback, useRef, useState } from 'react'
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
    const [poll, setPoll] = useState(false)
    const authWindowRef = useRef(null);

    useInterval(async () => {
        if (currentStep === "ExchangeOAuth" && poll) {
            const { access_token } = TokenService.getAuthData() || {};
            if (!access_token) {
                await goToStep("Email")
                setPoll(false)
                return;
            }
            const exchanges = await (await getUserExchanges(access_token))?.data
            const exchangeIsEnabled = exchanges?.some(e => e.exchange === swapFormData?.exchange?.id && e.is_enabled)
            if (!swapFormData?.exchange?.baseObject?.authorization_flow || swapFormData?.exchange?.baseObject?.authorization_flow == "none" || exchangeIsEnabled) {
                goToStep("SwapConfirmation")
                setPoll(false)
                authWindowRef.current?.close()
            }

        }
    }, [currentStep, authWindowRef, poll], 7000)

    const handleConnect = useCallback(() => {
        try {
            setPoll(true)
            const access_token = TokenService.getAuthData()?.access_token
            if (!access_token)
                goToStep("Email")
            const { sub } = parseJwt(access_token) || {}
            const authWindow = window.open(oauth_redirect_url + sub, '_blank', 'width=420,height=720')
            authWindowRef.current = authWindow
        }
        catch (e) {
            setLocalError(e.message)
        }
    }, [oauth_redirect_url])

    const minimalAuthorizeAmount = Math.round(swapFormData?.currency?.baseObject?.price_in_usdt * Number(swapFormData?.amount) + 5)
    const exchange_name = swapFormData?.exchange?.name
    const error = localError + wizardError
    return (
        <>
            <div className="w-full px-3 md:px-8 py-6 pt-1 grid grid-flow-row min-h-[480px] text-pink-primary-300 font-light">

                <h3 className='mb-4 pt-2 text-xl text-center md:text-left font-roboto text-white font-semibold'>
                    Please connect your {exchange_name} account
                    <p className='mb-10 pt-2 text-base text-center md:text-left font-roboto text-sm text-pink-primary-300 font-light'>
                        You will leave Layerswap and be securely redirected to <span className='strong-highlight'>{exchange_name}</span> authorization page.
                    </p>
                    <div className="flex items-center text-pink-primary-300 border-2 p-4 rounded-md border-ouline-blue border-dashed">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2.5 stroke-pink-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <label className="block text-lg font-lighter leading-6 "> Make sure to authorize at least <span className='strong-highlight text-white'>{minimalAuthorizeAmount}$</span>. Follow this <Link key="userGuide" href="/userguide"><a className="strong-highlight hightlight-animation highlight-link hover:cursor-pointer">Step by step guide</a></Link></label>
                    </div>
                </h3>
                {
                    error &&
                    <div className="bg-[#3d1341] border-l-4 border-[#f7008e] p-4 mb-5 flex items-center">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <ExclamationIcon className="h-6 w-6 text-yellow-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-xl text-light-blue font-normal">
                                    {error}
                                </p>
                            </div>
                        </div>
                    </div>
                }
                <div className="text-white text-sm  mt-auto">
                    <div className="flex mt-12 md:mt-5 font-normal text-sm text-pink-primary-300 mb-3">
                        <label className="block font-lighter text-left leading-6"> Even after authorization Layerswap can't initiate a withdrawal without your explicit confirmation.</label>
                    </div>

                    <SubmitButton isDisabled={false} icon="" isSubmitting={false} onClick={handleConnect}>
                        Connect
                    </SubmitButton>
                </div>
            </div>

        </>
    )
}

export default AccountConnectStep;