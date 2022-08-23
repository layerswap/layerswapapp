import { UserIcon } from '@heroicons/react/solid';
import { Field, Form, Formik, FormikErrors } from 'formik';
import { FC, useCallback, useState } from 'react'
import toast from 'react-hot-toast';
import { useAuthDataUpdate } from '../context/authContext';
import TokenService from '../lib/TokenService';
import LayerSwapAuthApiClient from '../lib/userAuthApiClient';
import SubmitButton from './buttons/submitButton';


type EmailFormValues = {
    email: string;
}

type Props = {
    onSend: (email: string) => void
}

const EmailStep: FC<Props> = ({ onSend }) => {
    const initialValues: EmailFormValues = { email: '' };
    const [storedEmail, setStoredEmail] = useState<string>(undefined);
    const { setCodeRequested } = useAuthDataUpdate();

    const sendEmail = useCallback(async (values: EmailFormValues) => {
        try {
            const inputEmail = values.email;
            if (inputEmail != storedEmail) {
                const apiClient = new LayerSwapAuthApiClient();
                const res = await apiClient.getCodeAsync(inputEmail)
                if (!res.is_success)
                    throw new Error(res.errors)
                TokenService.setCodeNextTime(res?.data?.next)
                setCodeRequested(true);
            }
            setStoredEmail(inputEmail);
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
    }, [storedEmail])

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

                    <div className='flex flex-col items-stretch min-h-[500px] text-pink-primary-300'>
                        <div className="w-full px-6 md:px-8 pt-4 flex-col flex-1 flex">
                            <UserIcon className='w-16 h-16 mt-auto text-pink-primary self-center' />
                            <p className='mb-6 mt-2 pt-2 text-2xl font-bold text-white leading-6 text-center font-roboto'>
                                What's your email?
                            </p>
                            <p className='text-center text-base mb-6 px-2'>
                                With your email, your exchange credentials will stay linked to your account and you can access your entire transfer history.
                            </p>
                            <Form autoComplete='true'>
                                <div className="relative rounded-md shadow-sm mt-1 mb-12 md:mb-11">
                                    <Field name="email">
                                        {({ field }) => (
                                            <input
                                                {...field}
                                                id='email'
                                                placeholder="john@example.com"
                                                autoComplete="email"
                                                type="email"
                                                className="h-12 pb-1 pt-0 text-white  focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-42 block
                                                   placeholder:text-pink-primary-300 placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600  w-full font-semibold rounded-md placeholder-gray-400"
                                            />
                                        )}
                                    </Field>
                                </div>
                                <div className="text-white text-sm mt-24 sm:mt-28">
                                    <SubmitButton isDisabled={!isValid} icon="" isSubmitting={isSubmitting} >
                                        Continue
                                    </SubmitButton>
                                </div>
                            </Form>
                        </div>
                    </div >
                )}
            </Formik >
        </>
    )
}

export default EmailStep;