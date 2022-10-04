import { InformationCircleIcon } from '@heroicons/react/outline';
import { FC, useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import LayerswapApiClient from '../lib/layerSwapApiClient';
import ExchangeSettings from '../lib/ExchangeSettings';
import TokenService from '../lib/TokenService';
import { Exchange } from '../Models/Exchange';
import SubmitButton from './buttons/submitButton';
import { DocIframe } from './docInIframe';
import SlideOver from './SlideOver';
import WarningMessage from './WarningMessage';

type Props = {
    exchange: Exchange,
    onSuccess: () => void,
    slideOverPlace?: string
}

const ConnectApiKeyExchange: FC<Props> = ({ exchange, onSuccess, slideOverPlace }) => {
    const [key, setKey] = useState("")
    const [secret, setSecret] = useState("")
    const [loading, setLoading] = useState(false)
    const [keyphrase, setKeyphrase] = useState("")
    const [docIframeIsOpen, setDocIframeIsOpen] = useState(false)

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
            const layerswapApiClient = new LayerswapApiClient();
            const { access_token } = TokenService.getAuthData() || {};
            const res = await layerswapApiClient.ConnectExchangeApiKeys({ exchange: exchange?.internal_name, api_key: key, api_secret: secret, keyphrase: keyphrase }, access_token)
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
    const userGuideURL = ExchangeSettings.KnownSettings[exchange?.internal_name]?.UserApiKeyGuideUrl

    return (
        <>
            <div className="w-full flex flex-col justify-between h-full pt-4 space-y-5  text-primary-text">
                <div className="flex items-center">
                    <h3 className="block text-lg font-medium leading-6 text-white">
                        Please enter
                        {ExchangeSettings.KnownSettings[exchange?.internal_name]?.ExchangeApiKeyPageUrl ? <a target='_blank' href={ExchangeSettings.KnownSettings[exchange.id]?.ExchangeApiKeyPageUrl} className='mx-1 underline'>{exchange?.display_name}</a> : <span className='mx-1'>{exchange?.display_name}</span>}
                        API keys
                    </h3>
                </div>
                <div className='space-y-4'>
                    <div>
                        <label htmlFor="apiKey" className="block font-normal text-sm">
                            API Key
                        </label>
                        <div className="relative rounded-md shadow-sm mt-1">
                            <input
                                autoComplete="off"
                                placeholder="Your API Key"
                                autoCorrect="off"
                                type="text"
                                name="apiKey"
                                id="apiKey"
                                onChange={handleKeyChange}
                                className="h-12 pb-1 pt-0 focus:ring-primary focus:border-primary border-darkblue-500 block
                         placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-700 w-full font-semibold rounded-md placeholder-gray-400"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="apiSecret" className="block font-normal text-sm">
                            API Secret
                        </label>
                        <div className="relative rounded-md shadow-sm mt-1">
                            <input
                                autoComplete="off"
                                placeholder="Your API Secret"
                                autoCorrect="off"
                                type="text"
                                name="apiSecret"
                                id="apiSecret"
                                onChange={handleSecretChange}
                                className="h-12 pb-1 pt-0 focus:ring-primary focus:border-primary border-darkblue-500 block
                        placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-700 w-full font-semibold rounded-md placeholder-gray-400"
                            />
                        </div>
                    </div>
                    {
                        exchange?.has_keyphrase &&
                        <>
                            <label htmlFor="apiKey" className="block font-normal text-sm">
                                {ExchangeSettings.KnownSettings[exchange?.internal_name]?.KeyphraseDisplayName}
                            </label>
                            <div className="relative rounded-md shadow-sm mt-1">
                                <input
                                    autoComplete="off"
                                    placeholder={`Your ${ExchangeSettings.KnownSettings[exchange?.internal_name]?.KeyphraseDisplayName}`}
                                    autoCorrect="off"
                                    type="text"
                                    name="apiKey"
                                    onChange={handleKeyphraseChange}
                                    id="apiKey"
                                    className="h-12 pb-1 pt-0 focus:ring-primary focus:border-primary border-darkblue-500 block
                         placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-700 w-full font-semibold rounded-md placeholder-gray-400"
                                />
                            </div>
                        </>
                    }
                    {
                        ExchangeSettings.KnownSettings[exchange?.internal_name]?.AuthorizationNote &&
                        <WarningMessage className=''>
                            <div className='text-black'>
                                {ExchangeSettings.KnownSettings[exchange?.internal_name]?.AuthorizationNote}
                            </div>
                        </WarningMessage>
                    }
                    {
                        userGuideURL && <div className="flex items-center">
                            <span className="block text-base text-white font-normal leading-6"> Read about
                                <SlideOver opener={(open) => <>&nbsp;<a className='text-base text-primary cursor-pointer underline decoration-primary' onClick={() => open()}>How to get API Keys</a>&nbsp;</>} place={slideOverPlace}>
                                    {(close) => (
                                        <DocIframe onConfirm={() => close()} URl={userGuideURL} />
                                    )}
                                </SlideOver>
                            </span>
                        </div>
                    }

                </div>
                <div className='p-4 bg-darkblue-700 text-white rounded-lg border border-darkblue-500'>
                    <div className="flex items-center">
                        <InformationCircleIcon className='h-5 w-5 text-primary-600 mr-3' />
                        <label className="block text-sm md:text-base font-medium leading-6">We're requesting <span className='font-bold'>Read-Only</span> API Keys</label>
                    </div>
                    <ul className="list-disc font-light space-y-1 text-xs md:text-sm mt-2 ml-8">
                        <li>They <strong>DON'T</strong> allow us to place a trade or initiate a withdrawal</li>
                        <li>We use it to get your withdrawal history and match with our records</li>
                    </ul>
                </div>
                <div className="text-white text-base mt-3">
                    <SubmitButton isDisabled={!dataIsValid || loading} isSubmitting={loading} onClick={connect}>
                        Connect
                    </SubmitButton>
                </div>
            </div>
        </>
    )
}

export default ConnectApiKeyExchange;