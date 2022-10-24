import { FC } from 'react'
import { useSwapDataState } from '../../../context/swap';
import { useIntercom } from 'react-use-intercom';
import SubmitButton from '../../buttons/submitButton';
import { useAuthState } from '../../../context/authContext';
import MessageComponent from '../../MessageComponent';
import { useRouter } from 'next/router';
import { SwapStatus } from '../../../Models/SwapStatus';
import GoHomeButton from '../../utils/GoHome';

const FailedStep: FC = () => {
    const { swap } = useSwapDataState()
    const { email } = useAuthState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email, customAttributes: { swapId: swap?.data?.id } })
    const router = useRouter()

    return (
        <>
            {
                swap?.data?.status == SwapStatus.Failed &&
                <MessageComponent>
                    <MessageComponent.Content icon='red'>
                        <MessageComponent.Header>
                            {swap?.data.status == SwapStatus.Failed ? 'Swap failed' : 'Swap not found'}
                        </MessageComponent.Header>
                        <MessageComponent.Description>
                            {
                                swap?.data?.message ?
                                    swap.data.message
                                    :
                                    <div>
                                        <p>
                                            Sorry, there was an issue with your swap.
                                            Nothing to worry, your funds are safe!
                                            Please contact our support team with the button bellow and we'll help you fix this.
                                        </p>
                                        <span className='text-primary ml-1'>
                                            [contact our support team.]
                                        </span>
                                    </div>
                            }
                        </MessageComponent.Description>

                    </MessageComponent.Content>
                    <MessageComponent.Buttons>
                        <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => {
                            boot();
                            show();
                            updateWithProps()
                        }}>
                            Contact support
                        </SubmitButton>
                    </MessageComponent.Buttons>
                </MessageComponent>
            }
            {
                swap?.data?.status == SwapStatus.Cancelled &&
                <MessageComponent>
                    <MessageComponent.Content icon='red'>
                        <MessageComponent.Header>
                            Swap canceled
                        </MessageComponent.Header>
                        <MessageComponent.Description>
                            {
                                swap?.data?.message ?
                                    swap.data.message
                                    :
                                    <p>
                                        You've either canceled this swap manually, or you've created a swap immediatly after this and it replaced this one.
                                    </p>
                            }
                        </MessageComponent.Description>

                    </MessageComponent.Content>
                    <MessageComponent.Buttons>
                        <GoHomeButton>
                            <SubmitButton isDisabled={false} isSubmitting={false}>
                                Make another swap
                            </SubmitButton>
                        </GoHomeButton>
                    </MessageComponent.Buttons>
                </MessageComponent>
            }
            {
                swap?.data?.status == SwapStatus.Expired &&
                <MessageComponent>
                    <MessageComponent.Content icon='red'>
                        <MessageComponent.Header>
                            Swap expired
                        </MessageComponent.Header>
                        <MessageComponent.Description>
                            {
                                swap?.data?.message ?
                                    swap.data.message
                                    :
                                    <p>
                                        This swap was not completed during the allocated timeframe and was expired. If you’ve already sent crypto for this swap please contact support.
                                    </p>
                            }
                        </MessageComponent.Description>

                    </MessageComponent.Content>
                    <MessageComponent.Buttons>
                        <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => {
                            boot();
                            show();
                            updateWithProps()
                        }}>
                            Contact support
                        </SubmitButton>
                    </MessageComponent.Buttons>
                </MessageComponent>
            }
        </>
    )
}

export default FailedStep;