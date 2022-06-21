import { ExclamationIcon } from '@heroicons/react/outline';
import { Field, Form, Formik, FormikErrors, FormikProps } from 'formik';
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useAuthDataUpdate } from '../../../../context/auth';
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import TokenService from '../../../../lib/TokenService';
import LayerSwapAuthApiClient from '../../../../lib/userAuthApiClient';
import { LoginWizardSteps } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';

type EmailFormValues = {
    email?: string;
    email_confirm_right_wallet?: boolean;
    email_confirm_right_information?: boolean;
}

const EmailStep: FC = () => {
    const formikRef = useRef<FormikProps<EmailFormValues>>(null);

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState()
    const { updateEmail } = useAuthDataUpdate()
    const { goToStep, setLoading: setWizardLoading } = useFormWizardaUpdate<LoginWizardSteps>()

    useEffect(() => {
        setWizardLoading(false)
    }, [])

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
            goToStep("Code")
        }
        catch (e) {
            setError(e.message)
            console.log(e)
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
            <Formik
                enableReinitialize={true}
                innerRef={formikRef}
                initialValues={{ email_confirm_right_information: false, email_confirm_right_wallet: false, email: "" }}
                validateOnMount={true}
                onSubmit={sendEmail}
                validate={(values) => {
                    let errors: FormikErrors<EmailFormValues> = {};
                    if (!values.email_confirm_right_information)
                        errors.email_confirm_right_information = 'Confirmation is required'
                    if (!values.email_confirm_right_wallet)
                        errors.email_confirm_right_wallet = 'Confirmation is required'
                }}
            >
                {({ values, setFieldValue, errors, isSubmitting, handleChange }) => (
                    <Form>
                        <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                            {
                                error &&
                                <div className="bg-[#3d1341] border-l-4 border-[#f7008e] p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <ExclamationIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-light-blue">
                                                {error}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            }
                            <p className='mb-12 md:mb-3.5 text-white mt-4 pt-2 text-xl leading-6 text-center md:text-left font-roboto'>We will send 6 digits code to your email for the verification.</p>
                            <div>
                                <label htmlFor="email" className="block font-normal text-light-blue text-sm">
                                    Email
                                </label>
                                <div className="relative rounded-md shadow-sm mt-1 mb-12 md:mb-11">
                                    <Field name="email" validate={validateEmail}>
                                        {({ field }) => (
                                            <input
                                                {...field}
                                                placeholder="Your email"
                                                autoCorrect="off"
                                                type="text"
                                                name="email"
                                                id="email"
                                                className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary focus:border border-darkblue-100 pr-36 block
                                        placeholder:text-light-blue placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 border-gray-600 w-full font-semibold rounded-md placeholder-gray-400"
                                            />
                                        )}
                                    </Field>
                                </div>
                            </div>
                            <div className="text-white text-sm mt-auto">
                                <SubmitButton isDisabled={loading || !!errors.email || !!errors.email_confirm_right_information || !!errors.email_confirm_right_wallet} icon="" isSubmitting={loading} onClick={() => { }}>
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

export default EmailStep;