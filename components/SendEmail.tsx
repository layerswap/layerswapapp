import { Disclosure } from '@headlessui/react';
import { ChevronDown, User } from 'lucide-react';
import { Field, Form, Formik, FormikErrors } from 'formik';
import { FC, useCallback, useState } from 'react'
import toast from 'react-hot-toast';
import LayerswapApiClient, { SwapItem, SwapType } from '../lib/layerSwapApiClient';
import { useAuthDataUpdate, useAuthState, UserType } from '../context/authContext';
import { useTimerState } from '../context/timerContext';
import TokenService from '../lib/TokenService';
import LayerSwapAuthApiClient from '../lib/userAuthApiClient';
import SubmitButton from './buttons/submitButton';
import Widget from './Wizard/Widget';
import { useFormWizardaUpdate } from '../context/formWizardProvider';
import { SwapCreateStep } from '../Models/Wizard';

type EmailFormValues = {
    email: string;
}

type Props = {
    onSend: (email: string) => void;
    disclosureLogin?: boolean;
}

const SendEmail: FC<Props> = ({ onSend, disclosureLogin }) => {
    const { codeRequested, tempEmail, userType } = useAuthState()
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
                const next = new Date(res?.data?.next)
                const now = new Date()
                const miliseconds = next.getTime() - now.getTime()
                startTimer(Math.round((res?.data?.already_sent ? 60000 : miliseconds) / 1000))
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
                        {
                            disclosureLogin ?
                                <div>
                                    <Disclosure>
                                        {({ open }) => (
                                            <>
                                                <Disclosure.Button className="w-full text-left text-base font-light">
                                                    <div className='flex items-center justify-between'>
                                                        <p className='text-xl text-white'>
                                                            Sign in with email
                                                        </p>
                                                        <div className='bg-secondary-500 hover:bg-secondary-500 p-0.5 rounded-md duration-200 transition'>
                                                            <ChevronDown
                                                                className={`${open ? 'rotate-180 transform' : ''
                                                                    } h-5 text-primary-text`}
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className='mt-2 text-left text-primary-text'>
                                                        Securely store your exchange accounts, access your full transfer history and more.
                                                    </p>
                                                </Disclosure.Button>
                                                <Disclosure.Panel className="text-sm text-primary-text font-normal mt-4">
                                                    <div className='grid gap-4 grid-cols-5  items-center'>
                                                        <div className="relative rounded-md shadow-sm col-span-3">
                                                            <Field name="email">
                                                                {({ field }) => (
                                                                    <input
                                                                        {...field}
                                                                        id='email'
                                                                        placeholder="john@example.com"
                                                                        autoComplete="email"
                                                                        type="email"
                                                                        className="h-12 pb-1 pt-0 text-white  focus:ring-primary focus:border-primary border-secondary-500 pr-42 block
                                                   placeholder:text-primary-text placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-secondary-700 w-full font-semibold rounded-md"
                                                                    />
                                                                )}
                                                            </Field>
                                                        </div>
                                                        <div className='col-start-4 col-span-2'>
                                                            <SubmitButton isDisabled={!isValid} isSubmitting={isSubmitting} >
                                                                Continue
                                                            </SubmitButton>
                                                        </div>
                                                    </div>
                                                </Disclosure.Panel>
                                            </>
                                        )}
                                    </Disclosure>
                                </div>
                                :
                                <Widget>
                                    <Widget.Content center={true}>
                                        <User className='w-16 h-16 text-primary self-center mt-auto' />
                                        <div>
                                            <p className='mb-6 mt-2 pt-2 text-2xl font-bold text-white leading-6 text-center font-roboto'>
                                                What's your email?
                                            </p>
                                            <p className='text-center text-base mb-6 px-2 text-primary-text'>
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
                                                        className="h-12 pb-1 pt-0 text-white  focus:ring-primary focus:border-primary border-secondary-500 pr-42 block
                                                   placeholder:text-primary-text placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-secondary-700 w-full font-semibold rounded-md"
                                                    />
                                                )}
                                            </Field>
                                        </div>
                                    </Widget.Content>
                                    <Widget.Footer>
                                        <SubmitButton isDisabled={!isValid} isSubmitting={isSubmitting} >
                                            Continue
                                        </SubmitButton>
                                    </Widget.Footer>
                                </Widget>
                        }
                    </Form>
                )}
            </Formik >
        </>
    )
}

export default SendEmail;