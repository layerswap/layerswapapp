import { FC } from 'react'
import SubmitButton from '../../buttons/submitButton';
import MessageComponent from '../../MessageComponent';

const ExchangeDelay: FC = () => {

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
                    window.open('https://app.gitbook.com/o/QbBlgXv3cYaTIBw4Ijiz/s/60lDEkZWkqpblJDopzKQ/why-is-coinbase-transfer-taking-so-long', '_blank')
                }}>
                    Learn More
                </SubmitButton>
            </MessageComponent.Buttons>
        </MessageComponent>
    )
}

export default ExchangeDelay;
