import { Form, Formik, FormikErrors } from 'formik';
import { FC, useCallback, useState } from 'react'
import { CheckCircle2 } from 'lucide-react';
import { useIntercom } from 'react-use-intercom';
import { SendFeedbackMessage } from '../../lib/telegram';
import SubmitButton from '../Buttons/submitButton';
import { ErrorDisplay } from '../Pages/Swap/Form/SecondaryComponents/validationError/ErrorDisplay';
import ErrorDismissButton from '../Pages/Swap/Form/SecondaryComponents/validationError/ErrorDismissButton';
import FailIcon from '../Icons/FailIcon';

interface SendFeedbackFormValues {
    Feedback: string;
}

type Props = {
    onSend: () => void
}

const SendFeedback: FC<Props> = ({ onSend }) => {
    const initialValues: SendFeedbackFormValues = { Feedback: '' }
    const { boot, show, update } = useIntercom()
    const [error, setError] = useState<string>("")
    const [sent, setSent] = useState(false)

    const handleSendFeedback = useCallback(async (values: SendFeedbackFormValues) => {
        if (values.Feedback.length === 0) return
        setError("")
        try {
            const sender = "No login"
            const res = await SendFeedbackMessage(sender, values.Feedback)
            if (!res.ok) {
                throw new Error(res.description || "Could not send feedback, something went wrong")
            }
            setSent(true)
        }
        catch (e) {
            setError(e.message)
        }
    }, [])

    if (sent) {
        return (
            <div className="flex flex-col items-center justify-center text-center gap-3 py-10">
                <CheckCircle2 className="h-10 w-10 text-primary" />
                <p className="text-base text-primary-text font-medium">
                    Thank you for reaching out and providing us with valuable feedback.
                </p>
                <SubmitButton type="button" onClick={onSend}>
                    Close
                </SubmitButton>
            </div>
        )
    }

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
                    <div className='space-y-4 h-full mt-2'>
                        <p className='text-base text-left font-roboto text-secondary-text font-light'>
                            Please help us shape the product, catch bugs, and prioritize features. Your feedback will go directly into our Telegram channel.
                        </p>
                    </div>
                    <div className="text-primary-text text-sm space-y-4 flex flex-col pt-8">
                        <textarea
                            id='Feedback'
                            name='Feedback'
                            onChange={e => {
                                handleChange(e)
                            }}
                            className="h-40 max-h-60 appearance-none block bg-secondary-700 text-primary-text border border-secondary-500 rounded-md py-3 px-4 mb-3 leading-tight focus:ring-0 focus:bg-secondary-500 focus:border-secondary-100 "
                        />
                        <button
                            type="button"
                            onClick={() => {
                                boot();
                                show();
                                update()
                            }}
                            className="text-center disabled:text-primary-800 text-primary border-0 font-semibold rounded-md focus:outline-hidden transform hover:-translate-y-0.5 transition duration-200 ease-in-out"
                        >
                            Need help?
                        </button>
                        {error ? (
                            <ErrorDisplay
                                icon={<FailIcon className="h-5 w-5" />}
                                title="Couldn't send feedback"
                                message={error}
                                action={
                                    <ErrorDismissButton onClick={() => setError("")} />
                                }
                            />
                        ) : null}
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