import { FC, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { useQueryState } from '../context/query';
import { useSwapDataState, useSwapDataUpdate } from '../context/swap';
import { useInterval } from '../hooks/useInterval';
import { parseJwt } from '../lib/jwtParser';
import LayerSwapApiClient, { UserExchangesData } from '../lib/layerSwapApiClient';
import { OpenLink } from '../lib/openLink';
import TokenService from '../lib/TokenService';
import { ApiResponse } from '../Models/ApiResponse';
import Widget from './Wizard/Widget';
import Image from 'next/image'
import SwitchIcon from './icons/switchIcon';
import { ExternalLinkIcon } from '@heroicons/react/outline';
import SubmitButton from './buttons/submitButton';
import { Exchange } from '../Models/Exchange';
import { SwapFormValues } from './DTOs/SwapFormValues';
import { useFormikContext } from 'formik';

type Props = {
    OnSuccess: () => void,
}

const OfframpAccountConnectStep: FC<Props> = ({ OnSuccess }) => {
    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const { exchange, currency } = values || {}
    const { oauth_connect_url } = exchange?.baseObject || {}
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
            OnSuccess()
        }
    }, [authWindow])

    useInterval(
        checkShouldStartPolling,
        authWindow && !authWindow.closed ? 1000 : null,
    )

    useEffect(() => {
        if (exchange_accouts && salon && deposit_address) {
            const exchangeIsEnabled = exchange_accouts?.data?.some(e => e.exchange?.toLocaleLowerCase() === exchange.baseObject?.internal_name?.toLowerCase() && e.type === 'connect')
            if (exchangeIsEnabled) {
                OnSuccess()
                authWindowRef.current?.close()
            }
        }
    }, [exchange_accouts, salon, deposit_address])

    const handleConnect = useCallback(() => {
        try {
            const access_token = TokenService.getAuthData()?.access_token
            // if (!access_token)
            //     goToStep(SwapCreateStep.Email)
            const { sub } = parseJwt(access_token) || {}
            const encoded = btoa(JSON.stringify({ Type: 0, UserId: sub, RedirectUrl: `${window.location.origin}/salon` }))
            const authWindow = OpenLink({ link: oauth_connect_url + encoded, swap_data: values, query })
            setAuthWindow(authWindow)
        }
        catch (e) {
            toast.error(e.message)
        }
    }, [oauth_connect_url, query, values])

    return (
        <>
            <div className='w-full flex flex-col justify-between h-full space-y-5 text-primary-text'>
                <div className='flex flex-col self-center grow w-full'>
                    <div className='flex flex-col self-center grow w-full'>
                        <div className='flex flex-col self-start w-full text-left'>
                            <div className='text-left space-y-1'>
                                <p className='pt-2 text-lg md:text-xl text-white'>
                                    Coinbase Connect
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
                    </div>

                    <div className='mb-4'>
                        <a className='mb-2 flex text-sm items-center text-left underline hover:text-primary' href="https://docs.cloud.coinbase.com/sign-in-with-coinbase/docs/sign-in-with-coinbase" target="_blank">
                            Read more about Coinbase's OAuth API here
                            <ExternalLinkIcon className='ml-1 h-4 w-4'>
                            </ExternalLinkIcon>
                        </a>
                        <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleConnect}>
                            Connect
                        </SubmitButton>
                    </div>
                </div>
            </div>

        </>
    )
}

export default OfframpAccountConnectStep;