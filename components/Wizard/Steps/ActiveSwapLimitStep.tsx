import { useRouter } from 'next/router';
import { FC } from 'react'
import SubmitButton from '../../buttons/submitButton';
import MessageComponent from '../../MessageComponent';

const ActiveSwapLimit: FC = () => {

    const router = useRouter()

    return (
        <MessageComponent>
            <MessageComponent.Content icon='red'>
                <MessageComponent.Header>
                    Too Many Swaps
                </MessageComponent.Header>
                <MessageComponent.Description>
                    Test
                </MessageComponent.Description>
                <MessageComponent.Buttons>
                    <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => router.push('/transactions')}>
                        Go to cancel Swaps
                    </SubmitButton>
                </MessageComponent.Buttons>
            </MessageComponent.Content>
        </MessageComponent>
    )
}

export default ActiveSwapLimit;