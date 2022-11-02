import { FC } from 'react'
import SubmitButton from '../../buttons/submitButton';
import MessageComponent from '../../MessageComponent';
import GoHomeButton from '../../utils/GoHome';

const ExchangeDelay: FC = () => {

    return (
        <MessageComponent>
            <MessageComponent.Content icon='yellow'>
                <MessageComponent.Header>
                    Swap delayed
                </MessageComponent.Header>
                <MessageComponent.Description>
                    <p>This swap is being delayed by Coinbase. This usually means that the exchange needs additional verification.</p>
                    <p className='font-bold'>
                        What to do
                        <ul>
                            <li>Check your email for details from Coinbase</li>
                            <li>Check your Coinbase account's transfer history</li>
                        </ul>
                    </p>
                </MessageComponent.Description>
            </MessageComponent.Content>
            <MessageComponent.Buttons>
                <SubmitButton buttonStyle='outline' isDisabled={false} isSubmitting={false} onClick={() => {
                    window.open('https://docs.layerswap.io/user-docs/why-is-coinbase-transfer-taking-so-long', '_blank')
                }}>
                    Learn More
                </SubmitButton>
                <GoHomeButton>
                    <SubmitButton buttonStyle='outline' isDisabled={false} isSubmitting={false}>
                        Go Home
                    </SubmitButton>
                </GoHomeButton>
            </MessageComponent.Buttons>
        </MessageComponent>
    )
}

export default ExchangeDelay;
