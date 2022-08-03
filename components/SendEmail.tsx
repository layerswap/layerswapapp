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

    const sendEmail = useCallback(async (values) => {
        alert(values.emailz);

    }, [])

    return (
        <>
            <div className='flex flex-col items-stretch min-h-[500px] text-pink-primary-300'>
                <div className="w-full px-3 md:px-8 pt-4 flex-col flex-1 flex">
                    <UserIcon className='w-12 h-12 mt-auto text-pink-primary self-center' />
                    <p className='mb-6 mt-2 pt-2 text-2xl font-bold text-white leading-6 text-center font-roboto'>
                        What's your email?
                    </p>
                    <p className='text-center text-base  mb-12 px-2'>
                        With your email, your exchange credentials will stay linked to your account and you can access your entire transfer history.
                    </p>
                </div>
                <Formik
                    initialValues={{ emailz: undefined }}
                    onSubmit={(values) => {
                        alert(values.emailz)
                    }}
                >
                    {({ values, setFieldValue, errors, isSubmitting, handleChange }) => (
                        <Form>
                            <Field name="emailz">
                                {({ field }) => (
                                    <input
                                        {...field}
                                        placeholder="john@example.com"
                                        autoComplete="email"
                                        autoCorrect="off"
                                        type="email"
                                        className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-36 block
                                                   placeholder:text-pink-primary-300 placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600  w-full font-semibold rounded-md placeholder-gray-400"
                                    />
                                )}
                            </Field>
                            <div className="text-white text-sm mt-auto">
                                <SubmitButton type='submit' isDisabled={false} icon="" isSubmitting={false} >
                                    Continue
                                </SubmitButton>
                            </div>
                        </Form >
                    )}
                </Formik >
            </div>
        </>
    )
}

export default EmailStep;