import { Form, Formik, FormikErrors } from 'formik';
import { useCallback } from 'react'
import toast from 'react-hot-toast';
import { useAuthState } from '../context/authContext';
import SubmitButton from './buttons/submitButton';

interface SendFeedbackFormValues {
    Feedback: string;
}

const SendFeedback = () => {
    const token = "5366632516:AAHRlo58yEgoAj2-qe2poJOR19ybOuGMBpQ"
    const chat_id = "-1001625192521";
    const { email } = useAuthState()
    const initialValues: SendFeedbackFormValues = { Feedback: '' }

    const handleSendFeedback = useCallback(async (values: SendFeedbackFormValues) => {
        try {
            if (values.Feedback.length !== 0) {
                const res = await (await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat_id}&text=${email} %0A ${values.Feedback}`)).json()
                if (!res.ok) {
                    throw new Error(res.description || "Could not send feedback, something went wrong")
                } else {
                    toast.success("Thank you for reaching out and providing us with valuable feedback.")
                }
            } else if (values.Feedback.length == 0) {
                toast.error("This field is required and cannot be empty")
            }
        }
        catch (e) {
            toast.error(e.message)
        }
    }, [])

    return (
        <Formik
            initialValues={initialValues}
            onSubmit={handleSendFeedback}
            validateOnMount={true}
            validate={(values: SendFeedbackFormValues) => {
                const errors: FormikErrors<SendFeedbackFormValues> = {}
                if (values.Feedback.length === 0) {
                    errors.Feedback = "This field is required and cannot be empty";
                }
                return errors
            }}
        >
            {({ handleChange, isValid, isSubmitting }) => (
                <Form>
                    <h3 className='mb-4 pt-2 text-xl text-center md:text-left font-roboto text-white font-semibold'>
                        Send Feedback
                        <p className='mb-10 pt-2 text-base text-center md:text-left font-roboto text-pink-primary-300 font-light'>
                            Please help us shape the product, catch bugs, and prioritize features. Your feedback will go directly into our Telegram channel.
                        </p>
                    </h3>
                    <div className="flex flex-wrap -mx-3 mb-6">
                        <div className="w-full px-3">
                            <textarea
                                id='Feedback'
                                name='Feedback'
                                onChange={e => {
                                    handleChange(e)
                                }}
                                className="no-resize appearance-none block w-full bg-darkblue-600 text-white border border-darkblue-100 rounded-md py-3 px-4 mb-3 leading-tight focus:ring-0 focus:bg-darkblue-500 focus:border-darkblue-200 h-48 resize-none"
                            />
                        </div>
                    </div>
                    <div className="mt-3 sm:mt-6 text-white text-sm">
                        <SubmitButton type='submit' icon={''} isDisabled={isSubmitting || !isValid} isSubmitting={isSubmitting}>
                            Send
                        </SubmitButton>
                    </div>
                </Form>
            )}
        </Formik>
    )
}

export default SendFeedback;