import { FC, useCallback, useState } from 'react'
import toast from 'react-hot-toast';
import { useQueryState } from '../context/query';
import { useInterval } from '../hooks/useInterval';
import { parseJwt } from '../lib/jwtParser';
import { OpenLink } from '../lib/openLink';
import TokenService from '../lib/TokenService';
import Image from 'next/image'
import { ExternalLink, ArrowLeftRight } from 'lucide-react';
import SubmitButton from './buttons/submitButton';
import { SwapFormValues } from './DTOs/SwapFormValues';
import { useFormikContext } from 'formik';
import { SwapCreateStep } from '../Models/Wizard';
import { useFormWizardaUpdate } from '../context/formWizardProvider';
import { SwapType } from '../lib/layerSwapApiClient';

type Props = {
    OnSuccess: () => Promise<void>,
}

const OfframpAccountConnectStep: FC<Props> = ({ OnSuccess }) => {
    const {
        values,
    } = useFormikContext<SwapFormValues>();

    const { to, swapType } = values || {}
    const { oauth_connect_url } = (swapType === SwapType.OffRamp && to?.baseObject) || {}
    const [authWindow, setAuthWindow] = useState<Window>()
    const [loading, setLoading] = useState(false)
    const { goToStep } = useFormWizardaUpdate<SwapCreateStep>()

    const query = useQueryState()

    const checkShouldStartPolling = useCallback(async () => {
        if (authWindow.closed) {
            setLoading(false)
            return
        }
        let authWindowHref = ""
        try {
            authWindowHref = authWindow?.location?.href
        }
        catch (e) {
            //throws error when accessing href TODO research safe way
        }
        if (authWindowHref && authWindowHref?.indexOf(window.location.origin) !== -1) {
            authWindow?.close()
            await OnSuccess()
            setLoading(false)
        }
    }, [authWindow])

    useInterval(
        checkShouldStartPolling,
        authWindow && !authWindow.closed ? 1000 : null,
    )

    const handleConnect = useCallback(() => {
        setLoading(true)
        try {
            const access_token = TokenService.getAuthData()?.access_token
            if (!access_token)
                goToStep(SwapCreateStep.Email)
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
                                    <ArrowLeftRight />
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
                            <ExternalLink className='ml-1 h-4 w-4'>
                            </ExternalLink>
                        </a>
                        <SubmitButton  isDisabled={loading} isSubmitting={loading} onClick={handleConnect}>
                            Connect
                        </SubmitButton>
                    </div>
                </div>
            </div>

        </>
    )
}

export default OfframpAccountConnectStep;