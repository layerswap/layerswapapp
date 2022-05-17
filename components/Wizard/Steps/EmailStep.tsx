import { CheckIcon } from '@heroicons/react/outline';
import axios from 'axios';
import { Field, Form, Formik, FormikProps } from 'formik';
import { FC, useRef, useState } from 'react'
import { useSwapDataState } from '../../../context/swap';
import { useWizardState } from '../../../context/wizard';
import LayerSwapAuthApiClient from '../../../lib/userAuthApiClient';
import { AuthConnectResponse } from '../../../Models/LayerSwapAuth';
import SubmitButton from '../../buttons/submitButton';

type EmailFormValues = {
    email?: string;
    confirm_right_wallet?: boolean;
    confirm_right_information?: boolean;
}


const UserLoginStep: FC = () => {
    const formikRef = useRef<FormikProps<EmailFormValues>>(null);
    const formValues = formikRef.current?.values;

    const [loading, setLoading] = useState(false)

    const [email, setEmail] = useState()
    const { prevStep, nextStep } = useWizardState();
    const swapData = useSwapDataState()

    const checkButtonIcon = <CheckIcon className='h-5 w-5'></CheckIcon>


    const sendEmail = async () => {
        setLoading(true)
        var apiClient = new LayerSwapAuthApiClient();
        const res = await apiClient.getCodeAsync(formValues.email)
        console.log(res)
        setLoading(false)
        nextStep()
    }

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
            <Formik
                enableReinitialize={true}
                innerRef={formikRef}
                initialValues={{ confirm_right_information: false, confirm_right_wallet: false, email: "" }}
                validateOnMount={true}
                onSubmit={sendEmail}
            >
                {({ values, setFieldValue, errors, isSubmitting, handleChange }) => (
                    <Form>
                        <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                            <p className='mb-12 md:mb-3.5 text-white mt-4 pt-2 text-xl leading-6 text-center md:text-left font-roboto'>We will send 4 digits code to your email for the verification.</p>
                            <div>
                                <label htmlFor="email" className="block font-normal text-light-blue text-sm">
                                    Email
                                </label>
                                <div className="relative rounded-md shadow-sm mt-1 mb-12 md:mb-11">
                                    <Field name="email">
                                        {({ field }) => (
                                            <input
                                                {...field}
                                                placeholder="Your email"
                                                autoCorrect="off"
                                                type="text"
                                                name="email"
                                                id="email"
                                                className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-36 block
                                        placeholder:text-light-blue placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 border-gray-600 w-full font-semibold rounded-md placeholder-gray-400"
                                            />
                                        )}
                                    </Field>
                                    
                                </div>
                                <div className="flex items-center md:mb-3 mb-5">
                                    <Field name="confirm_right_wallet">
                                        {({ field }) => (
                                            <input
                                                {...field}
                                                inputMode="decimal"
                                                autoComplete="off"
                                                placeholder="Your email"
                                                autoCorrect="off"
                                                type="checkbox"
                                                name="confirm_right_wallet"
                                                id="confirm_right_wallet"
                                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                            />
                                        )}
                                    </Field>
                                    <label htmlFor="confirm_right_wallet" className="ml-3 block text-lg leading-6 text-light-blue cursor-pointer"> The provided address is your <span className='text-white'>{swapData.network?.name}</span> wallet address </label>
                                </div>
                                <div className="flex items-center mb-12 md:mb-11">
                                    <Field name="confirm_right_information">
                                        {({ field }) => (
                                            <input
                                                {...field}
                                                inputMode="decimal"
                                                autoComplete="off"
                                                placeholder="Your email"
                                                autoCorrect="off"
                                                type="checkbox"
                                                name="confirm_right_information"
                                                id="confirm_right_information"
                                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                            />
                                        )}
                                    </Field>
                                    <label htmlFor="confirm_right_information" className="ml-3 block text-lg leading-6 text-light-blue cursor-pointer"> Providing wrong information will result in a loss of funds </label>
                                </div>
                            </div>
                            <div className="text-white text-sm mt-auto">
                                <SubmitButton isDisabled={!loading && !errors} icon="" isSubmitting={loading} onClick={() => { }}>
                                    Send
                                </SubmitButton>
                            </div>
                        </div>
                    </Form >
                )}
            </Formik >

        </>
    )
}

export default UserLoginStep;