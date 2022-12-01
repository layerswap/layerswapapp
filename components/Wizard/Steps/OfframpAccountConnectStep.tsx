import { FC, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { useQueryState } from '../../../context/query';
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import { parseJwt } from '../../../lib/jwtParser';
import { OpenLink } from '../../../lib/openLink';
import TokenService from '../../../lib/TokenService';
import { SwapCreateStep } from '../../../Models/Wizard';
import SubmitButton from '../../buttons/submitButton';
import Image from 'next/image'
import { ExternalLinkIcon } from '@heroicons/react/outline';
import SwitchIcon from '../../icons/switchIcon';
import { useInterval } from '../../../hooks/useInterval';
import useSWR from 'swr';
import LayerSwapApiClient, { UserExchangesData } from '../../../lib/layerSwapApiClient';
import { ApiResponse } from '../../../Models/ApiResponse';
import Widget from '../Widget';

const OfframpAccountConnectStep: FC = () => {
    const { swapFormData } = useSwapDataState()
    const { exchange, currency } = swapFormData || {}
    const { o_auth_login_url } = exchange?.baseObject || {}
    const { goToStep } = useFormWizardaUpdate<SwapCreateStep>()
    const [authWindow, setAuthWindow] = useState<Window>()
    const [salon, setSalon] = useState(false)
    const { updateSwapFormData } = useSwapDataUpdate()

    const authWindowRef = useRef<Window | null>(null);
    const query = useQueryState()

    const layerswapApiClient = new LayerSwapApiClient()
    const exchange_accounts_endpoint = `/exchange_accounts`
    const depositad_address_endpoint = `/exchange_accounts/${exchange?.baseObject?.internal_name}/deposit_address/${currency?.baseObject?.asset?.toUpperCase()}`

    const { data: exchange_accouts } = useSWR<ApiResponse<UserExchangesData[]>>(salon ? exchange_accounts_endpoint : null, layerswapApiClient.fetcher)
    const { data: deposit_address } = useSWR<ApiResponse<string>>((exchange_accouts && salon) ? depositad_address_endpoint : null, layerswapApiClient.fetcher)

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
        if (exchange_accouts && salon && deposit_address) {
            const exchangeIsEnabled = exchange_accouts?.data?.some(e => e.exchange_id === exchange.baseObject?.id)
            if (!exchange?.baseObject?.authorization_flow || exchange?.baseObject?.authorization_flow == "none" || exchangeIsEnabled) {
                updateSwapFormData((old) => ({ ...old, destination_address: deposit_address.data }))
                goToStep(SwapCreateStep.Confirm)
                authWindowRef.current?.close()
            }
        }
    }, [exchange_accouts, salon, deposit_address])

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
        <Widget>
            <Widget.Content>
                <div className="mt-4 w-full flex flex-col h-full justify-between font-semibold text-primary-text">
                    <div className='text-left space-y-1'>
                        <p className='pt-2 text-lg md:text-xl text-white'>
                            {exchange_name} Connect
                        </p>
                        <p className='text-sm sm:text-base'>
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
                    </div>
                    <div className='font-normal space-y-4'>
                        <div>
                            <div className='text-primary  uppercase'>
                                Why
                            </div>
                            <p>
                                We will send the tokens to the Coinbase account associated with that email address.
                            </p>
                        </div>
                        <div>
                            <div className='text-primary  uppercase'>
                                Note
                            </div>
                            <p>
                                <span className='font-semibold'>Only the email address</span> of your account will be read, no other permissions will be asked.
                            </p>
                        </div>
                    </div>
                </div>
            </Widget.Content>
            <Widget.Footer>

                <a className='mb-2 flex text-sm items-center text-left underline hover:text-primary' href="https://docs.cloud.coinbase.com/sign-in-with-coinbase/docs/sign-in-with-coinbase" target="_blank">
                    Read more about Coinbase's OAuth API here
                    <ExternalLinkIcon className='ml-1 h-4 w-4'>
                    </ExternalLinkIcon>
                </a>
                <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleConnect}>
                    Connect
                </SubmitButton>
            </Widget.Footer>
        </Widget>
    )
}

export default OfframpAccountConnectStep;