import { FC, useCallback, useEffect } from 'react'
import { useSwapDataState } from '../../context/swap'
import { SwapStatus } from '../../Models/SwapStatus'
import { SwapItem } from '../../lib/layerSwapApiClient'
import Widget from '../../components/Wizard/Widget'
import SwapSummary from '../../components/Swap/Summary'
import MessageComponent from '../../components/MessageComponent'
import SubmitButton, { DoubleLineText } from '../../components/buttons/submitButton'
import { Home, MessageSquare } from 'lucide-react'
import GoHomeButton from '../../components/utils/GoHome'

const FailedStory: FC = () => {
    const { swap } = useSwapDataState()

    return (
        <>
            {
                swap?.status == SwapStatus.Failed &&
                <SwapFailed swap={swap} />
            }
        </>
    )
}
type Props = {
    swap: SwapItem
}


const SwapFailed = ({ swap }: Props) => {
    return (
        <Widget.Content>
            <SwapSummary />
            <MessageComponent>
                <MessageComponent.Content icon='red'>
                    <MessageComponent.Header>
                        Swap failed
                    </MessageComponent.Header>
                    <MessageComponent.Description>
                        {
                            swap?.message ?
                                swap.message
                                :
                                <>
                                    <p>
                                        Your funds are safe, but there seems to be an issue with the swap.
                                    </p>
                                    <p>  Please contact our support team and we’ll help you fix this.</p>
                                </>
                        }
                    </MessageComponent.Description>
                </MessageComponent.Content>
                <MessageComponent.Buttons>
                    <MessageComponent.Buttons>
                        <div className="flex flex-row text-white text-base space-x-2">
                            <div className='basis-1/3'>
                                <SubmitButton text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}>
                                    <DoubleLineText
                                        colorStyle='mltln-text-dark'
                                        primaryText='Support'
                                        secondarytext='Contact'
                                    />
                                </SubmitButton>
                            </div>
                            <div className='basis-2/3'>
                                <GoHomeButton>
                                    <SubmitButton button_align='right' text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<Home className="h-5 w-5" aria-hidden="true" />}>
                                        <DoubleLineText
                                            colorStyle='mltln-text-dark'
                                            primaryText='Swap'
                                            secondarytext='Do another'
                                        />
                                    </SubmitButton>
                                </GoHomeButton>
                            </div>
                        </div>
                    </MessageComponent.Buttons>
                </MessageComponent.Buttons>
            </MessageComponent>
        </Widget.Content>
    )
}


export default FailedStory;