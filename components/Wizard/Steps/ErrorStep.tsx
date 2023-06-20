import { FC, useEffect } from 'react'
import SubmitButton from '../../buttons/submitButton';
import MessageComponent from '../../MessageComponent';
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { KnownErrorCode } from '../../../Models/ApiError';
import { useIntercom } from 'react-use-intercom';
import { useSwapDataState } from '../../../context/swap';
import { useAuthState } from '../../../context/authContext';

const ErrorStep: FC = () => {
    const { error } = useFormWizardState()
    const { swap } = useSwapDataState()
    const { email, userId } = useAuthState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email, userId: userId, customAttributes: { swapId: swap?.id } })

    return (
        <>
            {
                error?.Code == KnownErrorCode.INSUFFICIENT_FUNDS &&
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
                error?.Code == KnownErrorCode.FUNDS_ON_HOLD &&
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
            {
                error?.Code == KnownErrorCode.NETWORK_ACCOUNT_ALREADY_EXISTS &&
                <MessageComponent>
                    <MessageComponent.Content icon='red'>
                        <MessageComponent.Header>
                            Connection failed
                        </MessageComponent.Header>
                        <MessageComponent.Description>
                            This sending address is already connected to another Layerswap account. For further clarification please contact support.
                        </MessageComponent.Description>
                    </MessageComponent.Content>
                    <MessageComponent.Buttons>
                        <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => {
                            boot();
                            show();
                            updateWithProps()
                        }}>
                            Contact Support
                        </SubmitButton>
                    </MessageComponent.Buttons>
                </MessageComponent>
            }
        </>
    )
}

export default ErrorStep;