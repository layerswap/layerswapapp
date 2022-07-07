import { FC, useState, Fragment, useEffect, useCallback } from 'react'
import { useAuthState } from '../context/auth';
import TokenService from '../lib/TokenService';
import SubmitButton from './buttons/submitButton';

type Props = {
    onSend: () => void
}
const SendFeedback: FC<Props> = ({ onSend }) => {
    const [loading, setLoading] = useState(false);
    const token = "5497557256:AAHOgmIi549pH8uiBvFsGmgH16kkBxSFtRA";
    const token2 = "5366632516:AAHRlo58yEgoAj2-qe2poJOR19ybOuGMBpQ"
    const chat_id = "-677284250";
    let api = new XMLHttpRequest();
    const { email } = useAuthState()

    const handleSendFeedback = useCallback(() => {
        try {
            setLoading(true)
            api.open("GET", `https://api.telegram.org/bot${token2}/sendMessage?chat_id=${chat_id}&text=${email} %0A ${(document.getElementById("feedback") as HTMLInputElement).value}`, true);
            api.send()
            onSend()
        }
        catch (e) {
            //TODO handle error
            console.log(e)
        }
        finally {
            setLoading(false)
        }
    }, [api])

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
                    <textarea id="feedback" className="no-resize appearance-none block w-full bg-darkblue-600 text-white border border-darkblue-100 rounded-md py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-darkblue-500 focus:border-darkblue-200 h-48 resize-none"></textarea>
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