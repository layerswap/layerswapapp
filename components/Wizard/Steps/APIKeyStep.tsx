import { InformationCircleIcon } from '@heroicons/react/outline';
import { FC, useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useAuthDataUpdate } from '../../../context/auth';
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { useSwapDataState } from '../../../context/swap';
import { BransferApiClient } from '../../../lib/bransferApiClients';
import { FormWizardSteps } from '../../../Models/Wizard';
import SubmitButton from '../../buttons/submitButton';
import { DocIframe } from '../../docInIframe';
import SlideOver, { SildeOverRef } from '../../SlideOver';

const APIKeyStep: FC = () => {

    const [key, setKey] = useState("")
    const [secret, setSecret] = useState("")
    const [keyphrase, setKeyphrase] = useState("")

    const [loading, setLoading] = useState(false);
    const { swapFormData } = useSwapDataState()
    const { goToStep } = useFormWizardaUpdate<FormWizardSteps>()
    const { getAuthData } = useAuthDataUpdate()

    const slideoverRef = useRef<SildeOverRef>()

    const handleCloseSlideover = useCallback(() => {
        slideoverRef.current.close()
    }, [slideoverRef])

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
            const authData = getAuthData()
            const res = await bransferApiClient.ConnectExchangeApiKeys({ exchange: swapFormData?.exchange?.id, api_key: key, api_secret: secret, keyphrase: keyphrase }, authData.access_token)
            if (res.is_success)
                goToStep("SwapConfirmation")
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
    }, [key, secret, keyphrase, swapFormData, getAuthData])

    const dataIsValid = secret && key && (swapFormData?.exchange?.baseObject?.has_keyphrase ? keyphrase : true)

    return (
        <>
            <div className="w-full px-8 py-6 space-y-5 grid grid-flow-row text-pink-primary-300">
                <div className="flex items-center">
                    <h3 className="block text-lg font-medium leading-6 mb-5 text-white">
                        Please enter your {swapFormData?.exchange?.name} API keys
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
                    <label htmlFor="withdrawlAmount" className="block font-normal text-sm">
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
                        swapFormData?.exchange?.baseObject?.has_keyphrase &&
                        <>
                            <label htmlFor="apiKey" className="block font-normal text-sm">
                                {swapFormData?.exchange?.baseObject?.keyphrase_display_name}
                            </label>
                            <div className="relative rounded-md shadow-sm mt-1 mb-5 md:mb-4">
                                <input
                                    autoComplete="off"
                                    placeholder={`Your ${swapFormData?.exchange?.baseObject?.keyphrase_display_name}`}
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
                    <div className="flex items-center">
                        <span className="block text-base text-white font-normal leading-6"> Read about
                            <SlideOver ref={slideoverRef} opener={<>&nbsp;<span className="text-base text-pink-primary cursor-pointer underline decoration-pink-primary">How to get API Keys</span>&nbsp;</>} moreClassNames="-mt-11">
                                <DocIframe onConfirm={handleCloseSlideover} URl="/blog/guide/How_to_transfer_crypto_from_Binance_to_L2" />
                            </SlideOver>
                        </span>
                    </div>
                </div>
                <div className='p-4 bg-darkblue-500 text-white rounded-lg border border-darkblue-100'>
                    <div className="flex items-center">
                        <InformationCircleIcon className='h-5 w-5 text-pink-primary-600 mr-3' />
                        <label className="block text-sm md:text-base font-medium leading-6">We're requesting <span className='font-bold'>Read-Only</span> api keys</label>
                    </div>
                    <ul className="list-disc font-light space-y-1 text-xs md:text-sm mt-1 ml-8">
                        <li>We use it to get your withdrawal history and match with our records</li>
                        <li>They <strong>DON'T</strong> allow us to place a trade or initiate a withdrawal</li>
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

export default APIKeyStep;