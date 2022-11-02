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
                    You can't have more than 5 unfinished swaps at the same time.
                    Please complete or cancel one of them from the Swap History page.
                </MessageComponent.Description>
            </MessageComponent.Content>
            <MessageComponent.Buttons>
                <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => router.push('/transactions')}>
                    Go To Swap History
                </SubmitButton>
            </MessageComponent.Buttons>
        </MessageComponent>
    )
}

export default ActiveSwapLimit;