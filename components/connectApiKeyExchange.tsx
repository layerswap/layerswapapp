import { ExclamationIcon, InformationCircleIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { BransferApiClient } from '../lib/bransferApiClients';
import ExchangeSettings from '../lib/ExchangeSettings';
import TokenService from '../lib/TokenService';
import { Exchange } from '../Models/Exchange';
import SubmitButton from './buttons/submitButton';
import { DocIframe } from './docInIframe';
import SlideOver, { SildeOverRef } from './SlideOver';

type Props = {
    exchange: Exchange,
    onSuccess: () => void
}

const ConnectApiKeyExchange: FC<Props> = ({ exchange, onSuccess }) => {
    const [key, setKey] = useState("")
    const [secret, setSecret] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter();
    const [keyphrase, setKeyphrase] = useState("")
    const slideoverRef = useRef<SildeOverRef>()

    const handleCloseSlideover = useCallback(() => {
        slideoverRef.current.close()
    }, [slideoverRef])
    useEffect(() => {
        setLoading(false)
    }, [exchange])

    const handleKeyChange = (e) => {
        setKey(e?.target?.value)
    }
    const handleSecretChange = (e) => {
        setSecret(e?.target?.value)
    }
    const handleKeyphraseChange = (e) => {
        setKeyphrase(e?.target?.value)
    }
    const connect = useCallback(async () => {
        try {
            setLoading(true)
            const bransferApiClient = new BransferApiClient();
            const { access_token } = TokenService.getAuthData() || {};
            const res = await bransferApiClient.ConnectExchangeApiKeys({ exchange: exchange?.internal_name, api_key: key, api_secret: secret, keyphrase: keyphrase }, access_token)
            onSuccess()
        }
        catch (error) {
            if (error.response?.data?.errors?.length > 0) {
                const message = error.response.data.errors.map(e => e.message).join(", ")
                toast.error(message)
            }
            else {
                toast.error(error.message)
            }
        }
        finally {
            setLoading(false)
        }
    }, [key, secret, keyphrase, exchange])

    const dataIsValid = secret && key && (exchange?.has_keyphrase ? keyphrase : true)
    const userGuideURL = ExchangeSettings.KnownSettings[exchange?.id]?.UserApiKeyGuideUrl

    return (
        <>
            <div className="w-full flex flex-col justify-between h-full px-6 md:px-8 pt-4 space-y-5  text-pink-primary-300">
                <div className="flex items-center">
                    <h3 className="block text-lg font-medium leading-6 text-white">
                        Please enter
                        {ExchangeSettings.KnownSettings[exchange?.id]?.ExchangeApiKeyPageUrl ? <a target='_blank' href={ExchangeSettings.KnownSettings[exchange.id]?.ExchangeApiKeyPageUrl} className='mx-1 underline'>{exchange?.name}</a> : <span className='mx-1'>{exchange?.name}</span>}
                        API keys
                    </h3>
                </div>
                <div className=''>
                    <label htmlFor="apiKey" className="block font-normal text-sm">
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
                            className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 block
                         placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 w-full font-semibold rounded-md placeholder-gray-400"
                        />
                    </div>
                    <label htmlFor="apiSecret" className="block font-normal text-sm">
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
                            className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 block
                        placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 w-full font-semibold rounded-md placeholder-gray-400"
                        />
                    </div>
                    {
                        exchange?.has_keyphrase &&
                        <>
                            <label htmlFor="apiKey" className="block font-normal text-sm">
                                {ExchangeSettings.KnownSettings[exchange?.id]?.KeyphraseDisplayName}
                            </label>
                            <div className="relative rounded-md shadow-sm mt-1 mb-5 md:mb-4">
                                <input
                                    autoComplete="off"
                                    placeholder={`Your ${ExchangeSettings.KnownSettings[exchange?.id]?.KeyphraseDisplayName}`}
                                    autoCorrect="off"
                                    type="text"
                                    name="apiKey"
                                    onChange={handleKeyphraseChange}
                                    id="apiKey"
                                    className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 block
                         placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 w-full font-semibold rounded-md placeholder-gray-400"
                                />
                            </div>
                        </>
                    }
                    {
                        ExchangeSettings.KnownSettings[exchange?.id]?.AuthorizationNote &&
                        <div className='flex-col w-full rounded-md bg-pink-700 shadow-lg p-2 mb-5'>
                            <div className='flex items-center'>
                                <div className='mr-2 p-2 rounded-lg bg-pink-600'>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <p className='font-normal text-sm text-white'>
                                    {ExchangeSettings.KnownSettings[exchange?.id]?.AuthorizationNote}
                                </p>
                            </div>
                        </div>
                    }
                    {
                        userGuideURL && <div className="flex items-center">
                            <span className="block text-base text-white font-normal leading-6"> Read about
                                <SlideOver ref={slideoverRef} opener={<>&nbsp;<span className="text-base text-pink-primary cursor-pointer underline decoration-pink-primary">How to get API Keys</span>&nbsp;</>} moreClassNames="-mt-11 md:-mt-8">
                                    <DocIframe onConfirm={handleCloseSlideover} URl={userGuideURL} />
                                </SlideOver>
                            </span>
                        </div>
                    }

                </div>
                <div className='p-4 bg-darkblue-500 text-white rounded-lg border border-darkblue-100'>
                    <div className="flex items-center">
                        <InformationCircleIcon className='h-5 w-5 text-pink-primary-600 mr-3' />
                        <label className="block text-sm md:text-base font-medium leading-6">We're requesting <span className='font-bold'>Read-Only</span> API Keys</label>
                    </div>
                    <ul className="list-disc font-light space-y-1 text-xs md:text-sm mt-2 ml-8">
                        <li>They <strong>DON'T</strong> allow us to place a trade or initiate a withdrawal</li>
                        <li>We use it to get your withdrawal history and match with our records</li>
                    </ul>
                </div>
                <div className="text-white text-base mt-3">
                    <SubmitButton isDisabled={!dataIsValid || loading} icon="" isSubmitting={loading} onClick={connect}>
                        Connect
                    </SubmitButton>
                </div>
            </div>
        </>
    )
}

export default ConnectApiKeyExchange;