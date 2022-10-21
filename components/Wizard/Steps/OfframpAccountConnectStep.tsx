import { FC, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { useQueryState } from '../../../context/query';
import { useSwapDataState } from '../../../context/swap';
import { useUserExchangeDataUpdate } from '../../../context/userExchange';
import { parseJwt } from '../../../lib/jwtParser';
import { OpenLink } from '../../../lib/openLink';
import TokenService from '../../../lib/TokenService';
import { SwapCreateStep } from '../../../Models/Wizard';
import SubmitButton from '../../buttons/submitButton';
import Image from 'next/image'
import { ExternalLinkIcon } from '@heroicons/react/outline';
import SwitchIcon from '../../icons/switchIcon';
import { useDelayedInterval, useInterval } from '../../../hooks/useInterval';
import useSWR from 'swr';
import LayerSwapApiClient, { UserExchangesResponse } from '../../../lib/layerSwapApiClient';

const OfframpAccountConnectStep: FC = () => {
    const { swapFormData } = useSwapDataState()
    const { exchange } = swapFormData || {}
    const { o_auth_login_url } = swapFormData?.exchange?.baseObject || {}
    const { goToStep } = useFormWizardaUpdate<SwapCreateStep>()
    const { currentStepName } = useFormWizardState<SwapCreateStep>()
    const { getUserExchanges } = useUserExchangeDataUpdate()
    const [authWindow, setAuthWindow] = useState<Window>()
    const [salon, setSalon] = useState(false)

    const authWindowRef = useRef<Window | null>(null);
    const query = useQueryState()

    const layerswapApiClient = new LayerSwapApiClient()
    const exchange_accounts_endpoint = `${LayerSwapApiClient.apiBaseEndpoint}/api/exchange_accounts`
    const { data: exchanges } = useSWR<UserExchangesResponse>(salon ? exchange_accounts_endpoint : null, layerswapApiClient.fetcher)

    const checkShouldStartPolling = useCallback(() => {
        let authWindowHref = ""
        try {
            authWindowHref = authWindow?.location?.href
        }
        catch (e) {
            //throws error when accessing href TODO research safe way
        }
        if (authWindowHref && authWindowHref?.indexOf(window.location.origin) !== -1) {
            setSalon(true)
            authWindow?.close()
        }
    }, [authWindow])

    useInterval(
        checkShouldStartPolling,
        authWindow && !authWindow.closed ? 1000 : null,
    )

    useEffect(() => {
        if (exchanges && salon) {
            const exchangeIsEnabled = exchanges?.data?.some(e => e.exchange_id === exchange.baseObject?.id)
            if (!exchange?.baseObject?.authorization_flow || exchange?.baseObject?.authorization_flow == "none" || exchangeIsEnabled) {
                goToStep(SwapCreateStep.Confirm)
                authWindowRef.current?.close()
            }
        }
    }, [exchanges, salon])

    const handleConnect = useCallback(() => {
        try {
            const access_token = TokenService.getAuthData()?.access_token
            if (!access_token)
                goToStep(SwapCreateStep.Email)
            const { sub } = parseJwt(access_token) || {}
            const encoded = btoa(JSON.stringify({ UserId: sub, RedirectUrl: `${window.location.origin}/salon` }))
            const authWindow = OpenLink({ link: o_auth_login_url + encoded, swap_data: swapFormData, query })
            setAuthWindow(authWindow)
        }
        catch (e) {
            toast.error(e.message)
        }
    }, [o_auth_login_url, query])

    const exchange_name = swapFormData?.exchange?.name

    return (
        <div className="w-full flex flex-col h-full justify-between font-semibold font-roboto text-primary-text">
            <div className='text-center md:text-left'>
                <p className='pt-2 text-lg md:text-xl text-white'>
                    Please connect your {exchange_name} account
                </p>
                <p>
                    Allow Layerswap to read your Coinbase account's <span className='text-white'>email address.</span>
                </p>
            </div>
            <div className="w-full color-white">
                <div className="flex justify-center items-center m-7 space-x-3">
                    <div className="flex-shrink-0 w-16 border-2 rounded-md border-darkblue-500 relative">
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
                    <div className="flex-shrink-0 w-16 border-2 rounded-md border-darkblue-500 relative">
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
                <div>
                    <div className='text-primary'>
                        Why
                    </div>
                    <p className='mb-5 leading-5 font-normal'>Requested tokens will be creditted to the Coinbase account associated with that email address.</p>
                    <p className='leading-5 font-normal'>This allows us to read <strong>only your account's email address</strong>, no other permissions will be requested.</p>
                </div>
            </div>

            <div className="text-white text-sm  mt-auto">
                <div className="flex md:mt-5 font-normal text-sm text-primary mb-3">
                    <label className="block font-medium text-left leading-5 hover:underline"><a className='flex items-center' href="https://docs.cloud.coinbase.com/sign-in-with-coinbase/docs/sign-in-with-coinbase" target="_blank">Read more about Coinbase's OAuth API here <ExternalLinkIcon className='ml-1 h-4 w-4'></ExternalLinkIcon></a> </label>
                </div>

                <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleConnect}>
                    Connect
                </SubmitButton>
            </div>
        </div>
    )
}

export default OfframpAccountConnectStep;