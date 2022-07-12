import { ExclamationIcon } from '@heroicons/react/outline';
import { swap } from 'formik';
import Link from 'next/link';
import { FC, useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useAuthDataUpdate } from '../../../context/auth';
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { useSwapDataState } from '../../../context/swap';
import { BransferApiClient, UserExchangesResponse } from '../../../lib/bransferApiClients';
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
            <div className="w-full px-8 py-6 grid grid-flow-row text-pink-primary-300">
                <div>
                    <div className="flex items-center">
                        <h3 className="block text-lg font-medium leading-6 mb-12 text-white">
                            Please enter your {swapFormData?.exchange?.name} API keys
                        </h3>
                    </div>

                    <div className='mb-5'>
                        <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 stroke-pink-primary-600 mr-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            <label className="block text-base font-medium leading-6"> How to get API keys </label>
                        </div>
                        <div className="flex items-center ml-6 pl-2.5">
                            <span className="block text-base font-normal leading-6"> Follow this
                                <SlideOver ref={slideoverRef} opener={<>&nbsp;<span className=" text-base cursor-pointer underline decoration-pink-primary">Step by step guide</span>&nbsp;</>} moreClassNames="-mt-11">
                                    <DocIframe onConfirm={handleCloseSlideover} URl="/blog/guide/How_to_transfer_crypto_from_Binance_to_L2" />
                                </SlideOver>
                                to generate your API keys. </span>
                        </div>
                    </div>
                    <div className='mb-5'>
                        <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 stroke-pink-primary-600 mr-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <label className="block text-base font-medium leading-6"> Why </label>
                        </div>
                        <div className="flex items-center ml-6 pl-2.5">
                            <label className="block text-base font-normal leading-6"> Layerswap uses your API keys to access your withrawal history and verify your payments. </label>
                        </div>
                    </div>

                    <div className="flex items-center mt-5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2.5 stroke-pink-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <label className="block text-base font-medium leading-6"> Note </label>
                    </div>
                    <div className="flex items-center ml-6 pl-2.5">
                        <label className="block text-base font-normal leading-6"> Read-only API keys can't used to initiate withrawal or place a trade. </label>
                    </div>

                </div>
                <div className='mt-10'>
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