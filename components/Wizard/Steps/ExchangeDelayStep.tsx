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
                    <p className='font-bold'>Check the email from Coinbase for details.</p>
                </MessageComponent.Description>
            </MessageComponent.Content>
            <MessageComponent.Buttons>
                <GoHomeButton>
                    <SubmitButton buttonStyle='outline' isDisabled={false} isSubmitting={false}>
                        Go Home
                    </SubmitButton>
                </GoHomeButton>
                <SubmitButton buttonStyle='outline' isDisabled={false} isSubmitting={false} onClick={() => {
                    window.open('https://app.gitbook.com/o/QbBlgXv3cYaTIBw4Ijiz/s/60lDEkZWkqpblJDopzKQ/why-is-coinbase-transfer-taking-so-long', '_blank')
                }}>
                    Learn More
                </SubmitButton>
            </MessageComponent.Buttons>
        </MessageComponent>
    )
}

export default ExchangeDelay;
