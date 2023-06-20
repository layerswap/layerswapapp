import { FC, useCallback, useEffect } from "react";
import MessageComponent from "../MessageComponent";
import SubmitButton, { DoubleLineText } from "../buttons/submitButton";
import GoHomeButton from "../utils/GoHome";
import { useAuthState } from "../../context/authContext";
import { useIntercom } from "react-use-intercom";
import { TrackEvent } from '../../pages/_document';
import { Home, MessageSquare } from "lucide-react";
import { useRouter } from "next/router";

const NotFound: FC = () => {

    const { email, userId } = useAuthState()
    const { boot, show, update } = useIntercom()
    const { query } = useRouter()
    const updateWithProps = () => update({ email: email, userId: userId, customAttributes: { swapId: query?.swapId } })

    useEffect(() => {
        plausible(TrackEvent.SwapFailed)
    }, [])

    const startIntercom = useCallback(() => {
        boot();
        show();
        updateWithProps()
    }, [boot, show, updateWithProps])

    return <MessageComponent>
        <MessageComponent.Content icon='red'>
            <MessageComponent.Header>
                Swap not found
            </MessageComponent.Header>
            <MessageComponent.Description>
                <span className="text-sm mt-5">
                    <p>
                        Your funds are safe, but there seems to be an issue with the swap.
                    </p>
                    <p>
                        Please contact our support team and we’ll help you fix this.
                    </p>
                </span>
            </MessageComponent.Description>
        </MessageComponent.Content>
        <MessageComponent.Buttons>
            <MessageComponent.Buttons>
                <div className="flex flex-row text-white text-base space-x-2">
                    <div className='basis-1/3'>
                        <SubmitButton text_align='left' onClick={startIntercom} isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}>
                            <DoubleLineText
                                colorStyle='mltln-text-dark'
                                primaryText='Support'
                                secondarytext='Contact'
                            />
                        </SubmitButton>
                    </div>
                    <div className='basis-2/3'>
                        <GoHomeButton>
                            <SubmitButton button_align='right' text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<Home className="h-5 w-5" aria-hidden="true" />}>
                                <DoubleLineText
                                    colorStyle='mltln-text-dark'
                                    primaryText='Swap'
                                    secondarytext='Do another'
                                />
                            </SubmitButton>
                        </GoHomeButton>
                    </div>
                </div>
            </MessageComponent.Buttons>
        </MessageComponent.Buttons>
    </MessageComponent>
}
export default NotFound