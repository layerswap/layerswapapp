import { ChevronDown, MailOpen } from 'lucide-react';
import { Form, Formik, FormikErrors } from 'formik';
import { FC, useCallback, useState } from 'react'
import toast from 'react-hot-toast';
import { useAuthDataUpdate, useAuthState, UserType } from '../context/authContext';
import { useTimerState } from '../context/timerContext';
import LayerSwapApiClient from '../lib/layerSwapApiClient';
import LayerSwapAuthApiClient from '../lib/userAuthApiClient';
import { AuthConnectResponse } from '../Models/LayerSwapAuth';
import SubmitButton from './buttons/submitButton';
import { DocIframe } from './docInIframe';
import NumericInput from './Input/NumericInput';
import Modal from './modal/modal';
import TimerWithContext from './TimerComponent';
import { classNames } from './utils/classNames';
import Widget from './Wizard/Widget';
interface VerifyEmailCodeProps {
    onSuccessfullVerify: (authresponse: AuthConnectResponse) => Promise<void>;
    disclosureLogin?: boolean
}

interface CodeFormValues {
    Code: string
}

const VerifyEmailCode: FC<VerifyEmailCodeProps> = ({ onSuccessfullVerify, disclosureLogin }) => {
    const initialValues: CodeFormValues = { Code: '' }
    const { start: startTimer, started } = useTimerState()
    const { tempEmail, userLockedOut, guestAuthData, userType } = useAuthState();
    const { updateAuthData, setUserLockedOut } = useAuthDataUpdate()
    const [modalUrl, setModalUrl] = useState<string>(null);
    const [showDocModal, setShowDocModal] = useState(false)

    const handleResendCode = useCallback(async () => {
        try {
            const apiClient = new LayerSwapAuthApiClient();
            const res = await apiClient.getCodeAsync(tempEmail)
            const next = new Date(res?.data?.next)
            const now = new Date()
            const miliseconds = next.getTime() - now.getTime()
            startTimer(Math.round((res?.data?.already_sent ? 60000 : miliseconds) / 1000))
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

    const openDoc = (url: string) => {
        setModalUrl(url)
        setShowDocModal(true)
    }

    const handleOpenTerms = () => openDoc('https://docs.layerswap.io/user-docs/information/terms-of-services')
    const handleOpenPrivacyPolicy = () => openDoc('https://docs.layerswap.io/user-docs/information/privacy-policy')

    const timerCountdown = userLockedOut ? 600 : 60

    return (<>
        <Modal height='full' show={showDocModal} setShow={setShowDocModal} >
            <DocIframe onConfirm={() => close()} URl={modalUrl} />
        </Modal>
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
                    var apiAuthClient = new LayerSwapAuthApiClient();
                    var apiClient = new LayerSwapApiClient()
                    const res = await apiAuthClient.connectAsync(tempEmail, values.Code)
                    updateAuthData(res)
                    await onSuccessfullVerify(res);
                    if (userType == UserType.GuestUser) await apiClient.SwapsMigration(guestAuthData.access_token)
                }
                catch (error) {
                    const message = error.response.data.error_description
                    if (error.response?.data?.error === 'USER_LOCKED_OUT_ERROR') {
                        toast.error(message)
                        setUserLockedOut(true)
                        startTimer(600)
                    }
                    else if (error.response?.data?.error_description) {
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
                    {
                        disclosureLogin ?
                            <div className='mt-2'>
                                <div className="w-full text-left text-base font-light">
                                    <div className='flex items-center justify-start'>
                                        <p className='text-xl text-white'>
                                            Sign in with email
                                        </p>
                                    </div>
                                    <p className='mt-2 text-left'>
                                        Please enter the 6 digit code sent to <span className='font-medium text-white'>{tempEmail}</span>
                                    </p>
                                </div>
                                <div className="text-sm text-primary-text font-normal mt-5">
                                    <div className='grid gap-4 grid-cols-5  items-center'>
                                        <div className="relative rounded-md shadow-sm col-span-3">
                                            <NumericInput
                                                pattern='^[0-9]*$'
                                                placeholder="XXXXXX"
                                                maxLength={6}
                                                name='Code'
                                                onChange={e => {
                                                    /^[0-9]*$/.test(e.target.value) && handleChange(e)
                                                }}
                                                className="leading-none h-12 text-2xl pl-5 text-white  focus:ring-primary text-center focus:border-primary border-secondary-500 block
                                    placeholder:text-2xl placeholder:text-center tracking-widest placeholder:font-normal placeholder:opacity-50 bg-secondary-700  w-full font-semibold rounded-md placeholder-primary-text"
                                            />
                                        </div>
                                        <div className='col-start-4 col-span-2'>
                                            <TimerWithContext isStarted={started} seconds={timerCountdown} waitingComponent={() => (
                                                <SubmitButton type="submit" isDisabled={!isValid || userLockedOut} isSubmitting={isSubmitting}>
                                                    {userLockedOut ? 'User is locked out' : 'Confirm'}
                                                </SubmitButton>
                                            )}>
                                                <SubmitButton type="submit" isDisabled={!isValid} isSubmitting={isSubmitting}>
                                                    Confirm
                                                </SubmitButton>
                                            </TimerWithContext>
                                        </div>
                                    </div>
                                    <span className="flex text-sm leading-6 items-center mt-0.5">
                                        <TimerWithContext isStarted={started} seconds={timerCountdown} waitingComponent={(remainingTime) => (
                                            <span className={classNames(userLockedOut && 'text-xl leading-6')}>
                                                Resend in
                                                <span className='ml-1'>
                                                    {remainingTime}
                                                </span>
                                            </span>
                                        )}>
                                            <span onClick={handleResendCode} className="decoration underline-offset-1 underline hover:no-underline decoration-primary-text hover:cursor-pointer">
                                                Resend code
                                            </span>
                                        </TimerWithContext>
                                    </span>
                                </div>
                            </div>
                            :
                            <Widget>
                                <Widget.Content center={true}>
                                    <MailOpen className='w-16 h-16 mt-auto text-primary self-center' />
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
                                            className="leading-none h-12 text-2xl pl-5 text-white  focus:ring-primary text-center focus:border-primary border-secondary-500 block
                                    placeholder:text-2xl placeholder:text-center tracking-widest placeholder:font-normal placeholder:opacity-50 bg-secondary-700  w-full font-semibold rounded-md placeholder-primary-text"
                                        />
                                        <span className="flex text-sm leading-6 items-center mt-1.5">
                                            <TimerWithContext isStarted={started} seconds={timerCountdown} waitingComponent={(remainingTime) => (
                                                <span className={classNames(userLockedOut && 'text-xl leading-6')}>
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
                                            onClick={handleOpenTerms}
                                            className='decoration decoration-primary underline-offset-1 underline hover:no-underline cursor-pointer'> Terms of Service
                                        </span> and&nbsp;
                                        <span
                                            onClick={handleOpenPrivacyPolicy}
                                            className='decoration decoration-primary underline-offset-1 underline hover:no-underline cursor-pointer'>Privacy Policy
                                        </span>
                                    </p>
                                    <TimerWithContext isStarted={started} seconds={timerCountdown} waitingComponent={() => (
                                        <SubmitButton type="submit" isDisabled={!isValid || userLockedOut} isSubmitting={isSubmitting}>
                                            {userLockedOut ? 'User is locked out' : 'Confirm'}
                                        </SubmitButton>
                                    )}>
                                        <SubmitButton type="submit" isDisabled={!isValid} isSubmitting={isSubmitting}>
                                            Confirm
                                        </SubmitButton>
                                    </TimerWithContext>
                                </Widget.Footer>
                            </Widget>
                    }
                </Form >
            )}
        </Formik>
    </>

    );
}

export default VerifyEmailCode;