import { MailOpenIcon } from '@heroicons/react/outline';
import { Form, Formik, FormikErrors } from 'formik';
import Link from 'next/link';
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useAuthDataUpdate, useAuthState } from '../context/authContext';
import LayerSwapAuthApiClient from '../lib/userAuthApiClient';
import { AuthConnectResponse } from '../Models/LayerSwapAuth';
import SubmitButton from './buttons/submitButton';
import NumericInput from './Input/NumericInput';

interface VerifyEmailCodeProps {
    onSuccessfullVerify: (authresponse: AuthConnectResponse) => Promise<void>;
}

interface CodeFormValues {
    Code: string
}

const VerifyEmailCode: FC<VerifyEmailCodeProps> = ({ onSuccessfullVerify }) => {
    const initialValues: CodeFormValues = { Code: '' }

    const { email, codeRequested } = useAuthState();
    const { updateAuthData } = useAuthDataUpdate()

    const [secondsRemaining, setSecondsRemaining] = useState(INITIAL_COUNT)
    const [status, setStatus] = useState(STATUS.STOPPED)

    const secondsToDisplay = secondsRemaining % 60
    const minutesRemaining = (secondsRemaining - secondsToDisplay) / 60
    const minutesToDisplay = minutesRemaining % 60

    const handleStart = () => {
        setStatus(STATUS.STARTED)
    }
    const handleReset = () => {
        setStatus(STATUS.STOPPED)
        setSecondsRemaining(INITIAL_COUNT)
    }

    useInterval(
        () => {
            if (secondsRemaining > 0) {
                setSecondsRemaining(secondsRemaining - 1)
            } else {
                setStatus(STATUS.STOPPED)
            }
        },
        status === STATUS.STARTED ? 1000 : null)

    const handleResendCode = useCallback(async () => {
        handleReset()
        handleStart()
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
    }, [email])

    useEffect(() => {
        if (codeRequested) {
            handleReset();
            handleStart();
        }

    }, [codeRequested])

    return (
        <>
            <Formik
                initialValues={initialValues}
                validateOnMount={true}
                validate={(values: CodeFormValues) => {
                    const errors: FormikErrors<CodeFormValues> = {};

                    if (!/^[0-9]*$/.test(values.Code)) {
                        errors.Code = "Value should be numeric";
                    }
                    else if (values.Code.length != 6) {
                        errors.Code = `The length should be 6 instead of ${values.Code.length}`;
                    }

                    return errors;
                }}
                onSubmit={async (values: CodeFormValues) => {
                    try {
                        var apiClient = new LayerSwapAuthApiClient();
                        const res = await apiClient.connectAsync(email, values.Code)
                        updateAuthData(res)
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
                }}
            >
                {({ isValid, isSubmitting, errors, handleChange }) => (
                    <Form className='flex flex-col items-stretch min-h-[500px] text-pink-primary-300'>
                        <div className="w-full px-3 md:px-8 pt-4 flex-col flex-1 flex">
                            <MailOpenIcon className='w-16 h-16 mt-auto text-pink-primary self-center' />
                            <div className='text-center mt-5'>
                                <p className='text-lg'>Please enter the 6 digit code sent to <span className='font-medium text-white'>{email}</span></p>
                            </div>
                            <div className="relative rounded-md shadow-sm mt-5">
                                <NumericInput
                                    pattern='^[0-9]*$'
                                    placeholder="XXXXXX"
                                    maxLength={6}
                                    name='Code'
                                    onChange={e => {
                                        /^[0-9]*$/.test(e.target.value) && handleChange(e)
                                    }}
                                    className="leading-none h-12 text-2xl pl-5 text-white  focus:ring-pink-primary text-center focus:border-pink-primary border-darkblue-100 block
                                    placeholder:text-2xl placeholder:text-center tracking-widest placeholder:font-normal placeholder:opacity-50 bg-darkblue-600  w-full font-semibold rounded-md placeholder-gray-400"
                                />
                            </div>
                            <div className="mt-5">
                                {
                                    status == STATUS.STARTED ?
                                        <span className="flex items-center">
                                            Send again in
                                            <span className='ml-1'>
                                                {twoDigits(minutesToDisplay)}:
                                                {twoDigits(secondsToDisplay)}
                                            </span>
                                        </span>
                                        :
                                        <p className=" flex font-lighter leading-6 text-center">
                                            <span className="ml-1 font-lighter decoration underline-offset-1 underline hover:no-underline decoration-pink-primary hover:cursor-pointer" onClick={handleResendCode}>
                                                Resend code
                                            </span>
                                        </p>
                                }
                            </div>
                            <div className="text-white text-sm mt-auto">
                                <p className='mb-5 text-pink-primary-300'>
                                    By clicking Confirm you agree to Layerswap's <Link href="/blog/guide/Terms_of_Service"><a className='decoration decoration-pink-primary underline-offset-1 underline hover:no-underline'> Terms of Service</a></Link> and <Link href="/blog/guide/Privacy_Policy"><a className='decoration decoration-pink-primary underline-offset-1 underline hover:no-underline'>Privacy Policy</a></Link>
                                </p>
                                <SubmitButton type="submit" isDisabled={!isValid} icon="" isSubmitting={isSubmitting}>
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

function useInterval(callback, delay) {
    const savedCallback = useRef(undefined)

    useEffect(() => {
        savedCallback.current = callback
    }, [callback])

    useEffect(() => {
        function tick() {
            savedCallback.current()
        }
        if (delay !== null) {
            let id = setInterval(tick, delay)
            return () => clearInterval(id)
        }
    }, [delay])
}

const twoDigits = (num) => String(num).padStart(2, '0')
const STATUS = {
    STARTED: 'Started',
    STOPPED: 'Stopped',
}
const INITIAL_COUNT = 60

export default VerifyEmailCode;