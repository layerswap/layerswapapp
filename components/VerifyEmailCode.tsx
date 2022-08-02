import { MailOpenIcon } from '@heroicons/react/outline';
import { Field, Form, Formik, FormikProps } from 'formik';
import Link from 'next/link';
import { FC, useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useAuthDataUpdate, useAuthState } from '../context/auth';
import LayerSwapAuthApiClient from '../lib/userAuthApiClient';
import { AuthConnectResponse } from '../Models/LayerSwapAuth';
import SubmitButton from './buttons/submitButton';
import SpinIcon from './icons/spinIcon';

interface VerifyEmailCodeProps {
    onSuccessfullVerify: (authresponse: AuthConnectResponse) => Promise<void>;
}

const VerifyEmailCode: FC<VerifyEmailCodeProps> = ({ onSuccessfullVerify }) => {
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [loadingResend, setLoadingResend] = useState(false)

    const { email } = useAuthState();
    const { updateAuthData } = useAuthDataUpdate()
    const handleInputChange = (e) => {
        setCode(e?.target?.value)
    }

    const verifyCode = useCallback(async () => {
        try {
            setLoading(true)
            var apiClient = new LayerSwapAuthApiClient();
            const res = await apiClient.connectAsync(email, code)
            updateAuthData(res)
            setLoading(false)
            await onSuccessfullVerify(res);
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

    }, [email, code])

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
            <Formik
                initialValues={{ code: '' }}
                onSubmit={verifyCode}
            >
                {({ values, setFieldValue, errors, isSubmitting, handleChange }) => (
                    <Form className='flex flex-col items-stretch min-h-[500px] text-pink-primary-300'>
                        <div className="w-full px-3 md:px-8 pt-4 flex-col flex-1 flex">
                            <MailOpenIcon className='w-12 h-12 mt-auto text-pink-primary self-center' />
                            <div className='text-center mt-5'>
                                <p className='text-lg'>Please enter the 6 digit code sent to <span className='font-medium text-white'>{email}</span></p>
                            </div>
                            <div className="relative rounded-md shadow-sm mt-5">
                                <Field name="Code">
                                    {({ field }) => (
                                        <input
                                            {...field}
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
                                    )}
                                </Field>
                            </div>
                            <div className="flex items-center mt-5">
                                {
                                    loadingResend ?
                                        <span className="flex items-center pl-3">
                                            <SpinIcon className="animate-spin h-5 w-5 mr-3" />
                                        </span>
                                        :
                                        <label className="block font-lighter leading-6 text-center">
                                            Didn't receive it?
                                            <span className="pl-1 font-lighter decoration underline-offset-1 underline hover:no-underline decoration-pink-primary hover:cursor-pointer" onClick={handleResendCode}>
                                                Send again
                                            </span>
                                        </label>
                                }
                            </div>
                            <div className="text-white text-sm mt-auto">
                                <p className='mb-5 text-pink-primary-300'>
                                    By clicking continue to create an account, you agree to Layerswap's <Link href="/blog/guide/Terms_of_Service"><a className='decoration decoration-pink-primary underline-offset-1 underline hover:no-underline'> Terms of Conditions</a></Link> and <Link href="/blog/guide/Terms_of_Service"><a className='decoration decoration-pink-primary underline-offset-1 underline hover:no-underline'>Privacy Policy</a></Link>
                                </p>
                                <SubmitButton type="submit" isDisabled={code?.length != 6 || loading} icon="" isSubmitting={loading}>
                                    Confirm
                                </SubmitButton>
                            </div>
                        </div>
                    </Form >
                )}
            </Formik>
        </>
    )
}

export default VerifyEmailCode;