import { FC, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { useQueryState } from '../../../context/query';
import { useSwapDataState } from '../../../context/swap';
import { useUserExchangeDataUpdate } from '../../../context/userExchange';
import { useInterval } from '../../../hooks/useInterval';
import { parseJwt } from '../../../lib/jwtParser';
import { OpenLink } from '../../../lib/openLink';
import TokenService from '../../../lib/TokenService';
import { FormWizardSteps } from '../../../Models/Wizard';
import SubmitButton from '../../buttons/submitButton';
import Carousel, { CarouselItem, CarouselRef } from '../../Carousel';
import Image from 'next/image'
import { ExternalLinkIcon, SwitchHorizontalIcon } from '@heroicons/react/outline';
import SwitchIcon from '../../icons/switchIcon';

const OfframpAccountConnectStep: FC = () => {
    const { swapFormData } = useSwapDataState()
    const { oauth_login_redirect_url } = swapFormData?.exchange?.baseObject || {}
    const { goToStep } = useFormWizardaUpdate<FormWizardSteps>()
    const { currentStep } = useFormWizardState<FormWizardSteps>()
    const { getUserExchanges } = useUserExchangeDataUpdate()
    const [poll, setPoll] = useState(false)
    const [addressSource, setAddressSource] = useState("")
    const authWindowRef = useRef(null);
    const query = useQueryState()

    useEffect(() => {
        let isImtoken = (window as any)?.ethereum?.isImToken !== undefined;
        let isTokenPocket = (window as any)?.ethereum?.isTokenPocket !== undefined;
        setAddressSource((isImtoken && 'imtoken') || (isTokenPocket && 'tokenpocket') || query.addressSource)
    }, [query])

    useInterval(async () => {
        if (currentStep === "OffRampExchangeOAuth" && poll) {
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
            authWindowRef.current = OpenLink({ link: oauth_login_redirect_url + sub, swap_data: swapFormData, query })
        }
        catch (e) {
            toast.error(e.message)
        }
    }, [oauth_login_redirect_url, addressSource, query])

    const exchange_name = swapFormData?.exchange?.name

    return (
        <>
            <div className="w-full px-8 md:grid md:grid-flow-row min-h-[480px] font-semibold font-roboto text-pink-primary-300">
                <h3 className=' pt-2 text-xl text-center md:text-left  text-white'>
                    Please connect your {exchange_name} account
                </h3>
                <p>
                    Allow Layerswap to read your Coinbase account's <span className='text-white'>email address.</span>
                </p>
                <div className="w-full color-white">
                    <div className="flex justify-center items-center m-7 space-x-3">
                        <div className="flex-shrink-0 w-16 border-2 rounded-md border-ouline-blue relative">
                            <Image
                                src="/images/coinbaseWhite.png"
                                alt="Exchange Logo"
                                height="40"
                                width="40"
                                layout="responsive"
                                className="object-contain rounded-md"
                            />
                        </div>
                        <SwitchIcon />
                        <div className="flex-shrink-0 w-16 border-2 rounded-md border-ouline-blue relative">
                            <Image
                                src="/images/layerswapWhite.png"
                                alt="Layerswap Logo"
                                height="40"
                                width="40"
                                layout="responsive"
                                className="object-contain rounded-md"
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <div className='text-pink-primary'>
                        Why
                    </div>
                    <p className='mb-5 leading-5 font-normal'>Requested tokens will be creditted to the Coinbase account associated with that email address.</p>
                    <p className='leading-5 font-normal'>This allows us to read <strong>only your account's email address</strong>, no other permissions will be requested.</p>
                </div>

                <div className="text-white text-sm  mt-auto">
                    <div className="flex md:mt-5 font-normal text-sm text-pink-primary mb-3">
                        <label className="block font-medium text-left leading-5 hover:underline"><a className='flex items-center' href="https://docs.cloud.coinbase.com/sign-in-with-coinbase/docs/sign-in-with-coinbase" target="_blank">Read more about Coinbase's OAuth API here <ExternalLinkIcon className='ml-1 h-4 w-4'></ExternalLinkIcon></a> </label>
                    </div>

                    <SubmitButton isDisabled={false} icon="" isSubmitting={false} onClick={handleConnect}>
                        Connect
                    </SubmitButton>
                </div>
            </div>
        </>
    )
}

export default OfframpAccountConnectStep;