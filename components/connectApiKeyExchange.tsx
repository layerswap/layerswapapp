import { InformationCircleIcon } from '@heroicons/react/outline';
import { FC, useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import LayerswapApiClient from '../lib/layerSwapApiClient';
import ExchangeSettings from '../lib/ExchangeSettings';
import { Exchange } from '../Models/Exchange';
import SubmitButton from './buttons/submitButton';
import { slideOverPlace } from './SlideOver';
import WarningMessage from './WarningMessage';
import { useRouter } from 'next/router';
import Widget from './Wizard/Widget';
import GuideLink from './guideLink';


type Props = {
    exchange: Exchange,
    onSuccess: () => Promise<void>,
    slideOverPlace?: slideOverPlace,
    stickyFooter?: boolean
}

const ConnectApiKeyExchange: FC<Props> = ({ exchange, onSuccess, slideOverPlace, stickyFooter = true }) => {
    const [key, setKey] = useState("")
    const [secret, setSecret] = useState("")
    const [loading, setLoading] = useState(false)
    const [keyphrase, setKeyphrase] = useState("")
    const router = useRouter();

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
            const layerswapApiClient = new LayerswapApiClient(router);
            await layerswapApiClient.ConnectExchangeApiKeys({ exchange: exchange?.internal_name, api_key: key, api_secret: secret, keyphrase: keyphrase })

            await onSuccess()
        }
        catch (error) {
            if (error.response?.data?.error) {
                const message = error.response.data.error.message
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
        <Widget>
            <Widget.Content>
                <div className="w-full flex flex-col justify-between h-full space-y-5 text-primary-text">
                    <div className="flex items-center">
                        <h3 className="block sm:text-lg font-medium leading-6 text-white">
                            Please enter
                            {ExchangeSettings.KnownSettings[exchange?.internal_name]?.ExchangeApiKeyPageUrl ? <a target='_blank' href={ExchangeSettings.KnownSettings[exchange.internal_name]?.ExchangeApiKeyPageUrl} className='mx-1 underline'>{exchange?.display_name}</a> : <span className='mx-1'>{exchange?.display_name}</span>}
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
                            <div>
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
                            </div>
                        }
                        {
                            ExchangeSettings.KnownSettings[exchange?.internal_name]?.AuthorizationNote &&
                            <WarningMessage>
                                {ExchangeSettings.KnownSettings[exchange?.internal_name]?.AuthorizationNote}
                            </WarningMessage>
                        }
                        {
                            userGuideURL &&
                            <WarningMessage messageType='informing'>
                                <span className='flex-none'>
                                    Learn how to get
                                </span>
                                <GuideLink text="API Keys" userGuideUrl={userGuideURL} place={slideOverPlace} />
                            </WarningMessage>
                        }
                    </div>
                </div>
            </Widget.Content>
            <Widget.Footer sticky={stickyFooter}>
                <div className='p-4 bg-darkblue-700 text-white rounded-lg border border-darkblue-500 mb-5'>
                    <div className="flex items-center">
                        <InformationCircleIcon className='h-5 w-5 text-primary-600 mr-3' />
                        <label className="block text-sm md:text-base font-medium leading-6">We're requesting <span className='font-bold'>Read-Only</span> API Keys</label>
                    </div>
                    <ul className="list-disc font-light space-y-1 text-xs md:text-sm mt-2 ml-8">
                        <li>They <strong>DON'T</strong> allow us to place a trade or initiate a withdrawal</li>
                        <li>We use it to get your withdrawal history and match with our records</li>
                    </ul>
                </div>
                <SubmitButton isDisabled={!dataIsValid || loading} isSubmitting={loading} onClick={connect}>
                    Connect
                </SubmitButton>
            </Widget.Footer>
        </Widget>
    )
}

export default ConnectApiKeyExchange;