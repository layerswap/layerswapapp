import { FC, useEffect } from 'react'
import SubmitButton from '../../buttons/submitButton';
import MessageComponent from '../../MessageComponent';
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { KnownwErrorCode } from '../../../Models/ApiError';

const ErrorStep: FC = () => {
    const { error } = useFormWizardState()
    const { setGoBack, goToStep } = useFormWizardaUpdate()

    useEffect(() => {
        if (error?.Step)
            setGoBack(() => goToStep(error.Step, "back"))
    }, [error])

    return (
        <>
            {
                error?.Code == KnownwErrorCode.INSUFFICIENT_FUNDS &&
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
                error?.Code == KnownwErrorCode.FUNDS_ON_HOLD &&
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