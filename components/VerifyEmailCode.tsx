import { MailOpenIcon } from '@heroicons/react/outline';
import { Form, Formik, FormikErrors } from 'formik';
import Link from 'next/link';
import { FC, useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import { useAuthDataUpdate, useAuthState } from '../context/authContext';
import { useTimerState } from '../context/timerContext';
import LayerSwapAuthApiClient from '../lib/userAuthApiClient';
import { AuthConnectResponse } from '../Models/LayerSwapAuth';
import SubmitButton from './buttons/submitButton';
import { DocIframe } from './docInIframe';
import NumericInput from './Input/NumericInput';
import Modal from './modalComponent';
import TimerWithContext from './TimerComponent';
import Widget from './Wizard/Widget';
interface VerifyEmailCodeProps {
    onSuccessfullVerify: (authresponse: AuthConnectResponse) => Promise<void>;
}

interface CodeFormValues {
    Code: string
}

const TIMER_SECONDS = 60

const VerifyEmailCode: FC<VerifyEmailCodeProps> = ({ onSuccessfullVerify }) => {
    const initialValues: CodeFormValues = { Code: '' }
    const { start: startTimer, started } = useTimerState()
    const { tempEmail } = useAuthState();
    const { updateAuthData } = useAuthDataUpdate()
    const [modalUrl, setModalUrl] = useState<string>(null);

    const handleResendCode = useCallback(async () => {
        try {
            const apiClient = new LayerSwapAuthApiClient();
            const res = await apiClient.getCodeAsync(tempEmail)
            startTimer(TIMER_SECONDS)
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
    }, [tempEmail])

    return (<>
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
                    const res = await apiClient.connectAsync(tempEmail, values.Code)
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
                <Form className='h-full w-full text-primary-text'>
                    <Widget>
                        <Widget.Content center={true}>
                            <MailOpenIcon className='w-16 h-16 mt-auto text-primary self-center' />
                            <div className='text-center mt-5'>
                                <p className='text-lg'>Please enter the 6 digit code sent to <span className='font-medium text-white'>{tempEmail}</span></p>
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
                                    className="leading-none h-12 text-2xl pl-5 text-white  focus:ring-primary text-center focus:border-primary border-darkblue-500 block
                                    placeholder:text-2xl placeholder:text-center tracking-widest placeholder:font-normal placeholder:opacity-50 bg-darkblue-700  w-full font-semibold rounded-md placeholder-gray-400"
                                />
                                <span className="flex text-sm leading-6 items-center mt-1.5">
                                    <TimerWithContext isStarted={started} seconds={60} waitingComponent={(remainingTime) => (
                                        <span>
                                            Resend in
                                            <span className='ml-1'>
                                                {remainingTime}
                                            </span>
                                        </span>
                                    )}>
                                        <span onClick={handleResendCode} className="decoration underline-offset-1 underline hover:no-underline decoration-primary hover:cursor-pointer">
                                            Resend code
                                        </span>
                                    </TimerWithContext>
                                </span>
                            </div>
                        </Widget.Content>
                        <Widget.Footer>
                            <p className='text-primary-text text-xs sm:text-sm mb-3 md:mb-5'>
                                By clicking Confirm you agree to Layerswap's <span
                                    onClick={() => setModalUrl('https://docs.layerswap.io/user-docs/information/terms-of-services')}
                                    className='decoration decoration-primary underline-offset-1 underline hover:no-underline cursor-pointer'> Terms of Service
                                </span> and&nbsp;
                                <span
                                    onClick={() => setModalUrl('https://docs.layerswap.io/user-docs/information/privacy-policy')}
                                    className='decoration decoration-primary underline-offset-1 underline hover:no-underline cursor-pointer'>Privacy Policy
                                </span>
                            </p>
                            <SubmitButton type="submit" isDisabled={!isValid} isSubmitting={isSubmitting}>
                                Confirm
                            </SubmitButton>
                        </Widget.Footer>
                    </Widget>
                </Form >
            )}
        </Formik>
        <Modal className="bg-[#181c1f] sm:!pb-6 !pb-0" showModal={modalUrl != null} setShowModal={() => setModalUrl(null)} >
            <DocIframe URl={modalUrl} className='md:min-h-[calc(100vh-170px)]' />
        </Modal>
    </>

    );
}

export default VerifyEmailCode;