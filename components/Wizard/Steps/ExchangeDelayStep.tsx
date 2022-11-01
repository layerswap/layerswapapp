import { FC } from 'react'
import { useSwapDataState } from '../../../context/swap';
import SubmitButton from '../../buttons/submitButton';
import MessageComponent from '../../MessageComponent';
import { useRouter } from 'next/router';

const ExchangeDelay: FC = () => {
    const { swap } = useSwapDataState()
    const router = useRouter()

    return (
        <MessageComponent>
            <MessageComponent.Content icon='yellow'>
                <MessageComponent.Header>
                    Swap delayed
                </MessageComponent.Header>
                <MessageComponent.Description>
                    This swap has been processed, but it's being delayed by Coinbase. This usually means that Coinbase needs additional verification.
                </MessageComponent.Description>
            </MessageComponent.Content>
            <MessageComponent.Buttons>
                <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => {

                }}>
                    Check Coinbase
                </SubmitButton>
                <SubmitButton buttonStyle='outline' isDisabled={false} isSubmitting={false} onClick={() => {

                }}>
                    Learn More
                </SubmitButton>
            </MessageComponent.Buttons>
        </MessageComponent>
    )
}

export default ExchangeDelay;
