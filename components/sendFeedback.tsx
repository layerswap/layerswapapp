import { Form, Formik, FormikErrors } from 'formik';
import { FC, useCallback } from 'react'
import toast from 'react-hot-toast';
import { useIntercom } from 'react-use-intercom';
import { useAuthState } from '../context/authContext';
import SubmitButton from './buttons/submitButton';

interface SendFeedbackFormValues {
    Feedback: string;
}

type Props = {
    onSend: () => void
}

const SendFeedback: FC<Props> = ({ onSend }) => {
    const token = "5366632516:AAHRlo58yEgoAj2-qe2poJOR19ybOuGMBpQ"
    const chat_id = "-1001625192521";
    const { email } = useAuthState()
    const initialValues: SendFeedbackFormValues = { Feedback: '' }
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email })

    const handleSendFeedback = useCallback(async (values: SendFeedbackFormValues) => {
        try {
            if (values.Feedback.length !== 0) {
                const res = await (await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat_id}&text=${email} %0A ${values.Feedback}`)).json()
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
                    <div>
                        <h3 className='mb-4 pt-2 text-xl text-center md:text-left font-roboto text-white font-semibold'>
                            Send Feedback
                            <p className='mb-10 pt-2 text-base text-center md:text-left font-roboto text-pink-primary-300 font-light'>
                                Please help us shape the product, catch bugs, and prioritize features. Your feedback will go directly into our Telegram channel.
                            </p>
                        </h3>
                        <div className="flex flex-wrap -mx-3">
                            <div className="w-full px-3">
                                <textarea
                                    id='Feedback'
                                    name='Feedback'
                                    onChange={e => {
                                        handleChange(e)
                                    }}
                                    className="no-resize appearance-none block w-full bg-darkblue-600 text-white border border-darkblue-100 rounded-md py-3 px-4 mb-3 leading-tight focus:ring-0 focus:bg-darkblue-500 focus:border-darkblue-200 h-56 resize-none"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="text-white text-sm space-y-4">
                        <button
                            type="button"
                            onClick={() => {
                                boot();
                                show();
                                updateWithProps()
                            }}
                            className="text-center disabled:text-pink-primary-600 text-pink-primary relative justify-center border-0 font-semibold rounded-md focus:outline-none transform hover:-translate-y-0.5 transition duration-400 ease-in-out"
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