import { Form, Formik, FormikErrors } from 'formik';
import { FC, useCallback } from 'react'
import toast from 'react-hot-toast';
import { useIntercom } from 'react-use-intercom';
import { useAuthState } from '../context/authContext';
import { SendFeedbackMessage } from '../lib/telegram';
import SubmitButton from './buttons/submitButton';

interface SendFeedbackFormValues {
    Feedback: string;
}

type Props = {
    onSend: () => void
}

const SendFeedback: FC<Props> = ({ onSend }) => {
    const { email, userId } = useAuthState()
    const initialValues: SendFeedbackFormValues = { Feedback: '' }
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email, userId: userId })

    const handleSendFeedback = useCallback(async (values: SendFeedbackFormValues) => {
        try {
            if (values.Feedback.length !== 0) {
                const res = await SendFeedbackMessage(email, values.Feedback)
                if (!res.ok) {
                    throw new Error(res.description || "Could not send feedback, something went wrong")
                } else {
                    toast.success("Thank you for reaching out and providing us with valuable feedback.")
                    onSend()
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
                <Form className='flex flex-col justify-between'>
                    <div className='space-y-4 h-full'>
                        <p className='text-white font-semibold text-lg'>Send Feedback</p>
                        <p className='text-base text-left font-roboto text-primary-text font-light'>
                            Please help us shape the product, catch bugs, and prioritize features. Your feedback will go directly into our Telegram channel.
                        </p>
                    </div>
                    <div className="text-white text-sm space-y-4 flex flex-col pt-8">
                        <textarea
                            id='Feedback'
                            name='Feedback'
                            onChange={e => {
                                handleChange(e)
                            }}
                            className="h-40 max-h-60 appearance-none block bg-darkblue-700 text-white border border-darkblue-500 rounded-md py-3 px-4 mb-3 leading-tight focus:ring-0 focus:bg-darkblue-500 focus:border-darkblue-100 "
                        />
                        <button
                            type="button"
                            onClick={() => {
                                boot();
                                show();
                                updateWithProps()
                            }}
                            className="text-center disabled:text-primary-800 text-primary border-0 font-semibold rounded-md focus:outline-none transform hover:-translate-y-0.5 transition duration-200 ease-in-out"
                        >
                            Need help?
                        </button>
                        <SubmitButton type='submit' isDisabled={isSubmitting || !isValid} isSubmitting={isSubmitting}>
                            Send
                        </SubmitButton>
                    </div>
                </Form>
            )}
        </Formik>
    )
}

export default SendFeedback;