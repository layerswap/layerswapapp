
import { ExclamationIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import { useAuthDataUpdate, useAuthState } from '../../../../context/auth';
import { useInterval } from '../../../../hooks/useInyterval';
import TokenService from '../../../../lib/TokenService';
import LayerSwapAuthApiClient from '../../../../lib/userAuthApiClient';
import SubmitButton from '../../../buttons/submitButton';
import SpinIcon from '../../../icons/spinIcon';

const CodeStep: FC = () => {

    const [code, setCode] = useState("")
    // const { nextStep } = useWizardState();
    const [loading, setLoading] = useState(false)
    const [loadingResend, setLoadingResend] = useState(false)

    const nextTime = TokenService.getCodeNextTime()

    const router = useRouter();
    const { redirect } = router.query;

    const [resendTimeLeft, setResendTimeLeft] = useState(nextTime ? new Date(nextTime).getTime() - new Date().getTime() : 0)

    const { email, authData } = useAuthState();

    const { updateAuthData } = useAuthDataUpdate()
    const handleInputChange = (e) => {
        setCode(e?.target?.value)
    }

    useInterval(() => {
        if (nextTime && new Date(nextTime).getTime() > new Date().getTime())
            setResendTimeLeft(new Date(nextTime).getTime() - new Date().getTime())
        else
            setResendTimeLeft(0)
    }, [nextTime], 1000)

    const verifyCode = useCallback(async () => {
        try {
            setLoading(true)
            var apiClient = new LayerSwapAuthApiClient();
            const res = await apiClient.connectAsync(email, code)
            await updateAuthData(res)
            await router.push(redirect?.toString() || '/')

        }
        catch (error) {
            if (error.response?.data?.error_description) {
                const message = error.response.data.error_description
                toast.error(message)
            }
            else {
                toast.error(error.message)
            }
        }
        finally {
            setLoading(false)
        }

    }, [email, code, redirect])

    const handleResendCode = useCallback(async () => {
        setLoadingResend(true)
        try {
            const apiClient = new LayerSwapAuthApiClient();
            const res = await apiClient.getCodeAsync(email)
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
            setLoadingResend(false)
        }
    }, [email])

    return (
        <>
            <div className="w-full px-3 md:px-8 content-center flex flex-col justify-between min-h-[480px] text-pink-primary-300">
                <div className='mt-auto text-center'>
                    <p className='text-lg'>Please enter the 6 digit code sent to <p className='font-medium text-white'>{email}</p></p>
                </div>
                <div className='content-center mt-auto'>
                    <div className="relative rounded-md shadow-sm mt-2 mb-4 leading-none">
                        <input
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="XXXXXX"
                            autoCorrect="off"
                            type="text"
                            maxLength={6}
                            name="Code"
                            id="Code"
                            className="leading-none h-12 text-2xl pl-5 focus:ring-pink-primary text-center focus:border-pink-primary border-darkblue-100 block
                         placeholder:text-2xl placeholder:text-center tracking-widest placeholder:font-normal placeholder:opacity-50 bg-darkblue-600  w-full font-semibold rounded-md placeholder-gray-400"
                            onKeyPress={e => {
                                isNaN(Number(e.key)) && e.preventDefault()
                            }}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="flex items-center">
                        {
                            loadingResend ?
                                <span className="flex items-center pl-3">
                                    <SpinIcon className="animate-spin h-5 w-5 mr-3" />
                                </span>
                                :
                                <label className="block font-lighter leading-6 text-center">
                                    Didn't receive it?
                                    <button className="pl-1 font-lighter decoration underline-offset-1 underline hover:no-underline decoration-pink-primary hover:cursor-pointer" onClick={handleResendCode}>
                                        Send again
                                    </button>
                                </label>
                        }
                    </div>
                </div>

                <div className='mt-20'>
                    <div className="text-white text-sm mt-4">
                        <p className='mb-5 text-pink-primary-300'>
                            By clicking continue to create an account, you agree to Layerswap's <Link href="/blog/guide/Terms_of_Service"><a className='decoration decoration-pink-primary underline-offset-1 underline hover:no-underline'> Terms of Conditions</a></Link> and <Link href="/blog/guide/Terms_of_Service"><a className='decoration decoration-pink-primary underline-offset-1 underline hover:no-underline'>Privacy Policy</a></Link>
                        </p>
                        <SubmitButton isDisabled={code?.length != 6 || loading} icon="" isSubmitting={loading} onClick={verifyCode}>
                            Confirm
                        </SubmitButton>
                    </div>
                </div>

            </div>

        </>
    )
}

export default CodeStep;