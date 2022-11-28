import { FC } from 'react'
import { useSwapDataState } from '../../../context/swap';
import { useIntercom } from 'react-use-intercom';
import SubmitButton from '../../buttons/submitButton';
import { useAuthState } from '../../../context/authContext';
import MessageComponent from '../../MessageComponent';
import { SwapStatus } from '../../../Models/SwapStatus';
import GoHomeButton from '../../utils/GoHome';
import { useFormWizardState } from '../../../context/formWizardProvider';
import { KnownwErrorCode } from '../../../Models/ApiError';

const ErrorStep: FC = () => {
    const { swap } = useSwapDataState()
    const { email, userId } = useAuthState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email, userId: userId, customAttributes: { swapId: swap?.id } })
    const { error } = useFormWizardState()

    return (
        <>
            {
                error == KnownwErrorCode.INSUFFICIENT_FUNDS &&
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
            {
                error == KnownwErrorCode.FUNDS_ON_HOLD &&
                <MessageComponent>
                    <MessageComponent.Content icon='red'>
                        <MessageComponent.Header>
                            Swap failed
                        </MessageComponent.Header>
                        <MessageComponent.Description>
                            This transfer can't be processed because your funds might be on hold on Coinbase. This usually happens when you want to cash out immediately after completeing a purchare or adding cash.
                        </MessageComponent.Description>
                    </MessageComponent.Content>
                    <MessageComponent.Buttons>
                        <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => {
                            window.open("https://help.coinbase.com/en/coinbase/trading-and-funding/sending-or-receiving-cryptocurrency/available-balance-faq", "_blank")
                        }}>
                            Learn More
                        </SubmitButton>
                    </MessageComponent.Buttons>
                </MessageComponent>
            }
        </>
    )
}

export default ErrorStep;