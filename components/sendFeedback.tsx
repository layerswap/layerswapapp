import { FC, useState, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast';
import { useAuthState } from '../context/authContext';
import SubmitButton from './buttons/submitButton';

type Props = {
    onSend: () => void
}
const SendFeedback: FC<Props> = ({ onSend }) => {
    const [loading, setLoading] = useState(false);
    const token = "5366632516:AAHRlo58yEgoAj2-qe2poJOR19ybOuGMBpQ"
    const chat_id = "-1001625192521";
    const { email } = useAuthState()

    const handleSendFeedback = useCallback(async () => {
        try {
            const feedback = (document.getElementById("feedback") as HTMLInputElement).value
            setLoading(true)
            if (feedback.length !== 0) {
                const res = await (await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat_id}&text=${email} %0A ${feedback}`)).json()
                if (!res.ok) {
                    throw new Error(res.description || "Could not send feedback, something went wrong")

                } else {
                    toast.success("Thank you for reaching out and providing us with valuable feedback.")
                }
            } else if (feedback.length == 0) {
                toast.error("This field is required and cannot be empty")
            }
        }
        catch (e) {
            toast.error(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [])

    return (
        <>
            <h3 className='mb-4 pt-2 text-xl text-center md:text-left font-roboto text-white font-semibold'>
                Send Feedback
                <p className='mb-10 pt-2 text-base text-center md:text-left font-roboto text-pink-primary-300 font-light'>
                    Please help us shape the product, catch bugs, and prioritize features. Your feedback will go directly into our Telegram channel.
                </p>
            </h3>
            <div className="flex flex-wrap -mx-3 mb-6">
                <div className="w-full px-3">
                    <textarea id="feedback" className="no-resize appearance-none block w-full bg-darkblue-600 text-white border border-darkblue-100 rounded-md py-3 px-4 mb-3 leading-tight focus:ring-0 focus:bg-darkblue-500 focus:border-darkblue-200 h-48 resize-none"></textarea>
                </div>
            </div>
            <div className="mt-3 sm:mt-6 text-white text-sm">
                <SubmitButton icon={''} isDisabled={loading} isSubmitting={loading} onClick={handleSendFeedback}>
                    Send
                </SubmitButton>
            </div>
        </>
    )
}

export default SendFeedback;