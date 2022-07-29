import { UserIcon } from '@heroicons/react/solid';
import { Field, Form, Formik, FormikProps } from 'formik';
import { FC, useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useAuthDataUpdate } from '../context/auth';
import TokenService from '../lib/TokenService';
import LayerSwapAuthApiClient from '../lib/userAuthApiClient';
import SubmitButton from './buttons/submitButton';


type EmailFormValues = {
    email?: string;
    email_confirm_right_wallet?: boolean;
    email_confirm_right_information?: boolean;
}

type Props = {
    onSend: () => void
}

const EmailStep: FC<Props> = ({ onSend }) => {
    const formikRef = useRef<FormikProps<EmailFormValues>>(null);

    const [loading, setLoading] = useState(false)
    const { updateEmail } = useAuthDataUpdate()

    const sendEmail = useCallback(async (values) => {
        setLoading(true)
        try {
            const apiClient = new LayerSwapAuthApiClient();
            const email = values.email
            const res = await apiClient.getCodeAsync(email)
            if (!res.is_success)
                throw new Error(res.errors)
            TokenService.setCodeNextTime(res?.data?.next)
            updateEmail(email)
            onSend()
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
    }, [])

    function validateEmail(value) {
        let error;
        if (!value) {
            error = 'Required';
        } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value)) {
            error = 'Invalid email address';
        }
        return error;
    }

    return (
        <>
            <>
                <Formik
                    enableReinitialize={true}
                    innerRef={formikRef}
                    initialValues={{ email: "" }}
                    validateOnMount={true}
                    onSubmit={sendEmail}
                >
                    {({ values, setFieldValue, errors, isSubmitting, handleChange }) => (
                        <Form className='flex flex-col items-stretch min-h-[500px] text-pink-primary-300'>
                            <div className="w-full px-3 md:px-8 pt-4 flex-col flex-1 flex">
                                <UserIcon className='w-12 h-12 mt-auto text-pink-primary self-center' />
                                <p className='mb-6 mt-2 pt-2 text-2xl font-bold text-white leading-6 text-center font-roboto'>
                                    What's your email?
                                </p>
                                <p className='text-center text-base  mb-12 px-2'>
                                    With your email, your exchange credentials will stay linked to your account and you can access your entire transfer history.                              
                                </p>
                                <div className="relative rounded-md shadow-sm mt-1 mb-12 md:mb-11">
                                    <Field name="email" validate={validateEmail}>
                                        {({ field }) => (
                                            <input
                                                {...field}
                                                placeholder="john@example.com"
                                                autocomplete="home email"
                                                autoCorrect="off"
                                                type="email"
                                                name="email"
                                                id="email"
                                                className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-36 block
                                        placeholder:text-pink-primary-300 placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600  w-full font-semibold rounded-md placeholder-gray-400"
                                            />
                                        )}
                                    </Field>
                                </div>
                                <div className="text-white text-sm mt-auto">
                                    <SubmitButton isDisabled={loading || !!errors.email || !!errors.email_confirm_right_information || !!errors.email_confirm_right_wallet} icon="" isSubmitting={loading} >
                                        Continue
                                    </SubmitButton>
                                </div>
                            </div>
                        </Form >
                    )}
                </Formik >
            </>
        </>
    )
}

export default EmailStep;