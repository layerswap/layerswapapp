import { Info } from 'lucide-react';
import { FC, useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import LayerswapApiClient from '../lib/layerSwapApiClient';
import ExchangeSettings from '../lib/ExchangeSettings';
import { Exchange } from '../Models/Exchange';
import SubmitButton from './buttons/submitButton';
import WarningMessage from './WarningMessage';
import { useRouter } from 'next/router';
import GuideLink from './guideLink';
import { Layer } from '../Models/Layer';

type Props = {
    exchange: Layer & { isExchange: true },
    onSuccess: () => Promise<void>,
    stickyFooter?: boolean
}

const ConnectApiKeyExchange: FC<Props> = ({ exchange, onSuccess }) => {
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

    const dataIsValid = secret && key
    const userGuideURL = ExchangeSettings.KnownSettings[exchange?.internal_name]?.UserApiKeyGuideUrl

    return (
        <div className='w-full flex flex-col justify-between h-full space-y-5 text-primary-text text-left'>
            <div className='flex flex-col self-center grow w-full'>
                <div className='flex flex-col self-center grow w-full'>
                    <div className="flex items-center">
                        <h3 className="block text-primary-text mt-2 mb-4">
                            Please enter
                            {ExchangeSettings.KnownSettings[exchange?.internal_name]?.ExchangeApiKeyPageUrl ? <a target='_blank' href={ExchangeSettings.KnownSettings[exchange?.internal_name]?.ExchangeApiKeyPageUrl} className='mx-1 underline'>{exchange?.display_name}</a> : <span className='mx-1'>{exchange?.display_name}</span>}
                            API keys
                        </h3>
                    </div>
                    <div className='space-y-3'>
                        <div>
                            <label htmlFor="apiKey" className="block text-sm">
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
                                    className="h-12 pb-1 pt-0 focus:ring-primary focus:border-primary border-secondary-500 block
                         placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-secondary-700 w-full font-semibold rounded-md placeholder-primary-text"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="apiSecret" className="block text-sm">
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
                                    className="h-12 pb-1 pt-0 focus:ring-primary focus:border-primary border-secondary-500 block
                        placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-secondary-700 w-full font-semibold rounded-md placeholder-primary-text"
                                />
                            </div>
                        </div>
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
                                <GuideLink text="API Keys" userGuideUrl={userGuideURL} />
                            </WarningMessage>
                        }
                    </div>
                </div>
            </div>
            <div className='mb-4'>
                <div className='p-4 bg-secondary-700 text-white rounded-lg border border-secondary-500 mb-5'>
                    <div className="flex items-center">
                        <Info className='h-5 w-5 text-primary-600 mr-3' />
                        <label className="block text-sm md:text-base">We're requesting <span className='font-medium'>Read-Only</span> API Keys</label>
                    </div>
                    <ul className="list-disc font-light space-y-1 text-xs md:text-sm text-primary-text mt-2 ml-8">
                        <li>They <strong>DON'T</strong> allow us to place a trade or initiate a withdrawal</li>
                        <li>We use it to get your withdrawal history and match with our records</li>
                    </ul>
                </div>
                <SubmitButton isDisabled={!dataIsValid || loading} isSubmitting={loading} onClick={connect}>
                    Connect
                </SubmitButton>
            </div>
        </div>
    )
}

export default ConnectApiKeyExchange;