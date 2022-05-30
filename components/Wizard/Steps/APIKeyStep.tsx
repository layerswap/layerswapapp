import { CheckIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useCallback, useState } from 'react'
import { useAuthState } from '../../../context/auth';
import { useSwapDataState } from '../../../context/swap';
import { useWizardState } from '../../../context/wizard';
import { BransferApiClient } from '../../../lib/bransferApiClients';
import SubmitButton from '../../buttons/submitButton';

const APIKeyStep: FC = () => {

    const [key, setKey] = useState("")
    const [secret, setSecret] = useState("")
    const [loading, setLoading] = useState(false);
    const swapData = useSwapDataState()
    const { nextStep } = useWizardState();
    const { authData } = useAuthState()



    const handleKeyChange = (e) => {
        setKey(e?.target?.value)
    }
    const handleSecretChange = (e) => {
        setSecret(e?.target?.value)
    }

    const connect = useCallback(async () => {
        try {
            setLoading(true)
            const bransferApiClient = new BransferApiClient();
            const res = await bransferApiClient.ConnectExchangeApiKeys({ exchange: swapData.exchange?.id, api_key: key, api_secret: secret }, authData.access_token)
            if (res.is_success)
                nextStep()
            //TODO handle error
        }
        catch (e) {
            //TODO handle errror
        }
        finally {
            setLoading(false)
        }
    }, [key, secret, swapData, authData, nextStep])

    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                <div>
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 stroke-pink-primary mr-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <label className="block text-lg font-medium leading-6 text-white"> Why </label>
                    </div>
                    <div className="flex items-center">
                        <label className="block text-lg font-normal leading-6 text-light-blue"> Layerswap uses your API keys to access your withrawal history and verify your payments. </label>
                    </div>
                    <div className="flex items-center mt-5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2.5 stroke-pink-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <label className="block text-lg font-medium leading-6 text-white"> Note </label>
                    </div>
                    <div className="flex items-center">
                        <label className="block text-lg font-normal leading-6 text-light-blue"> Read-only API keys can't used to initiate withrawal or place a trade. </label>
                    </div>
                    <div className="flex items-center mt-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 stroke-pink-primary mr-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        <label className="block text-lg font-medium leading-6 text-white"> How to get API keys </label>
                    </div>
                    <div className="flex items-center">
                        <label className="block text-lg font-normal leading-6 text-light-blue"> Follow this <Link key="userGuide" href="/userguide"><a className="font-lighter text-darkblue underline hover:cursor-pointer">Step by step guide</a></Link> to generate your API keys. </label>
                    </div>
                </div>
                <div className='mt-10'>
                    <label htmlFor="apiKey" className="block font-normal text-light-blue text-sm">
                        API Key
                    </label>
                    <div className="relative rounded-md shadow-sm mt-1 mb-5 md:mb-4">
                        <input
                            autoComplete="off"
                            placeholder="Your API Key"
                            autoCorrect="off"
                            type="text"
                            name="apiKey"
                            id="apiKey"
                            onChange={handleKeyChange}
                            className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-36 block
                            placeholder:text-light-blue placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 border-gray-600 w-full font-semibold rounded-md placeholder-gray-400"
                        />
                    </div>
                    <label htmlFor="withdrawlAmount" className="block font-normal text-light-blue text-sm">
                        API Secret
                    </label>
                    <div className="relative rounded-md shadow-sm mt-1 mb-5 md:mb-4">
                        <input
                            autoComplete="off"
                            placeholder="Your API Secret"
                            autoCorrect="off"
                            type="text"
                            name="apiSecret"
                            id="apiSecret"
                            onChange={handleSecretChange}
                            className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-36 block
                            placeholder:text-light-blue placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 border-gray-600 w-full font-semibold rounded-md placeholder-gray-400"
                        />
                    </div>
                </div>
                <div className="text-white text-base mt-3">
                    <SubmitButton isDisabled={false} icon="" isSubmitting={loading} onClick={connect}>
                        Connect
                    </SubmitButton>
                </div>
            </div>

        </>
    )
}

export default APIKeyStep;