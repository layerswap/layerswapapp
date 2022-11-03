import { UserIcon } from '@heroicons/react/solid';
import { Field, Form, Formik, FormikErrors } from 'formik';
import { FC, useCallback } from 'react'
import toast from 'react-hot-toast';
import { useAuthDataUpdate, useAuthState } from '../context/authContext';
import { useTimerState } from '../context/timerContext';
import TokenService from '../lib/TokenService';
import LayerSwapAuthApiClient from '../lib/userAuthApiClient';
import SubmitButton from './buttons/submitButton';

type EmailFormValues = {
    email: string;
}

type Props = {
    onSend: (email: string) => void
}
const TIMER_SECONDS = 60

const SendEmail: FC<Props> = ({ onSend }) => {
    const { codeRequested, tempEmail } = useAuthState()
    const { setCodeRequested, updateTempEmail } = useAuthDataUpdate();
    const initialValues: EmailFormValues = { email: tempEmail ?? "" };
    const { start: startTimer } = useTimerState()
    const sendEmail = useCallback(async (values: EmailFormValues) => {
        try {
            const inputEmail = values.email;
            if (inputEmail != tempEmail || !codeRequested) {
                const apiClient = new LayerSwapAuthApiClient();
                const res = await apiClient.getCodeAsync(inputEmail)
                if (res.error)
                    throw new Error(res.error)
                TokenService.setCodeNextTime(res?.data?.next)
                setCodeRequested(true);
                updateTempEmail(inputEmail)
                startTimer(TIMER_SECONDS)
            }
            onSend(inputEmail)
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

    function validateEmail(values: EmailFormValues) {
        let error: FormikErrors<EmailFormValues> = {};
        if (!values.email) {
            error.email = 'Required';
        } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(values.email)) {
            error.email = 'Invalid email address';
        }
        return error;
    }

    return (
        <>
            <Formik
                initialValues={initialValues}
                onSubmit={sendEmail}
                validateOnMount={true}
                validate={validateEmail}
            >
                {({ isValid, isSubmitting }) => (

                    <Form autoComplete='true' className='w-full h-full'>
                        <div className='flex flex-col h-full justify-between'>
                            <UserIcon className='w-16 h-16 text-primary self-center mt-auto' />
                            <div>
                                <p className='mb-6 mt-2 pt-2 text-2xl font-bold text-white leading-6 text-center font-roboto'>
                                    What's your email?
                                </p>
                                <p className='text-center text-base mb-6 px-2'>
                                    With your email, your exchange credentials will stay linked to your account and you can access your entire transfer history.
                                </p>
                            </div>
                            <div className="relative rounded-md shadow-sm">
                                <Field name="email">
                                    {({ field }) => (
                                        <input
                                            {...field}
                                            id='email'
                                            placeholder="john@example.com"
                                            autoComplete="email"
                                            type="email"
                                            className="h-12 pb-1 pt-0 text-white  focus:ring-primary focus:border-primary border-darkblue-500 pr-42 block
                                                   placeholder:text-primary-text placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-700 w-full font-semibold rounded-md"
                                        />
                                    )}
                                </Field>
                            </div>
                            <div className="text-white text-sm mt-auto">
                                <SubmitButton isDisabled={!isValid} isSubmitting={isSubmitting} >
                                    Continue
                                </SubmitButton>
                            </div>
                        </div>

                    </Form>
                )}
            </Formik >
        </>
    )
}

export default SendEmail;