import { FC } from 'react'
import { useSwapDataState } from '../../../context/swap';
import { useIntercom } from 'react-use-intercom';
import SubmitButton from '../../buttons/submitButton';
import { useAuthState } from '../../../context/authContext';
import MessageComponent from '../../MessageComponent';
import { SwapStatus } from '../../../Models/SwapStatus';
import GoHomeButton from '../../utils/GoHome';

const ErrorStep: FC = () => {
    const { swap } = useSwapDataState()
    const { email, userId } = useAuthState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email, userId: userId, customAttributes: { swapId: swap?.data?.id } })

    return (
        <>
            {
                <MessageComponent>
                    <MessageComponent.Content icon='red'>
                        <MessageComponent.Header>
                            Swap failed
                        </MessageComponent.Header>
                        <MessageComponent.Description>
                                This transfer can't be processed because you don't have enough available funds on Coinbase.
                        </MessageComponent.Description>

                    </MessageComponent.Content>
                    <MessageComponent.Buttons>
                        <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => {
                           window.open("https://www.coinbase.com/", "_blank")
                        }}>
                            Check Coinbase
                        </SubmitButton>
                    </MessageComponent.Buttons>
                </MessageComponent>
            }
        </>
    )
}

export default ErrorStep;