import { FC, useCallback, useEffect } from 'react'
import { useSwapDataState } from '../../../context/swap';
import { useIntercom } from 'react-use-intercom';
import SubmitButton, { DoubleLineText } from '../../buttons/submitButton';
import { useAuthState } from '../../../context/authContext';
import MessageComponent from '../../MessageComponent';
import { SwapStatus } from '../../../Models/SwapStatus';
import GoHomeButton from '../../utils/GoHome';
import { SwapItem } from '../../../lib/layerSwapApiClient';
import { MessageSquare, Home } from 'lucide-react';
import { TrackEvent } from '../../../pages/_document';
import Widget from '../../Wizard/Widget';
import Cancell from '../../icons/Cancell';

const Failed: FC = () => {
    const { swap } = useSwapDataState()
    const { email, userId } = useAuthState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email, userId: userId, customAttributes: { swapId: swap?.id } })

    useEffect(() => {
        plausible(TrackEvent.SwapFailed)
    }, [])

    const startIntercom = useCallback(() => {
        boot();
        show();
        updateWithProps()
    }, [boot, show, updateWithProps])

    return (
        <>
            {
                swap?.status == SwapStatus.Failed &&
                <SwapFailed onGetHelp={startIntercom} swap={swap} />
            }
            {
                swap?.status == SwapStatus.Cancelled &&
                <Canceled onGetHelp={startIntercom} swap={swap} />
            }
            {
                swap?.status == SwapStatus.Expired &&
                <Expired onGetHelp={startIntercom} swap={swap} />
            }
        </>
    )
}
type Props = {
    swap: SwapItem
    onGetHelp: () => void
}

const Expired = ({ onGetHelp }: Props) => {
    return (
        <Widget.Content>
            <MessageComponent>
                <MessageComponent.Description>
                    {
                        <>
                            <div className='p-3 bg-secondary-700 text-white rounded-lg border border-secondary-500'>
                                <div className="flex items-center">
                                    <Cancell />
                                    <label className="block text-sm md:text-base font-medium">Swap expired</label>
                                </div>
                                <div className='mt-4 ml-1 text-xs md:text-sm text-white'>
                                    <p className='text-md text-left'>The transfer wasn’t completed during the allocated timeframe.</p>
                                    <ul className="list-inside font-light space-y-1 mt-2 text-left ">
                                        <li>If you’ve already sent crypto for this swap, your funds are safe, please contact our support.</li>
                                    </ul>
                                </div>
                            </div>
                        </>
                    }
                </MessageComponent.Description>
                <MessageComponent.Buttons>
                    <div className="flex flex-row text-primary-text text-base space-x-2 mt-2">
                        <div className='basis-1/3'>
                            <SubmitButton text_align='left' onClick={onGetHelp} isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}>
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
            </MessageComponent>
        </Widget.Content>
    )
}

const Canceled = ({ onGetHelp }: Props) => {
    return (
        <Widget.Content>
            <MessageComponent>
                <MessageComponent.Description>
                    {
                        <>
                            <div className='p-3 bg-secondary-700 text-white rounded-lg border border-secondary-500'>
                                <div className="flex items-center">
                                    <Cancell />
                                    <label className="block text-sm md:text-base font-medium">Swap cancelled</label>
                                </div>
                                <div className='mt-4 ml-1 text-xs md:text-sm text-white'>
                                    <p className='text-md text-left'>The transaction was cancelled by your request. If you have already sent funds, please contact support.</p>
                                </div>
                            </div>
                        </>
                    }
                </MessageComponent.Description>
                <MessageComponent.Buttons>
                    <div className="flex flex-row text-primary-text text-base space-x-2 mt-2">
                        <div className='basis-1/3'>
                            <SubmitButton text_align='left' onClick={onGetHelp} isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}>
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
            </MessageComponent>
        </Widget.Content>
    )
}
const SwapFailed = ({ onGetHelp }: Props) => {
    return (
        <Widget.Content>
            <MessageComponent.Buttons>
                <div className="flex text-primary-text text-base space-x-2">
                    <div className='basis-1/3 grow'>
                        <SubmitButton text_align='left' onClick={onGetHelp} isDisabled={false} isSubmitting={false} buttonStyle='filled' icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}>
                            <DoubleLineText
                                colorStyle='mltln-text-light'
                                primaryText='Contact Support'
                                secondarytext=''
                            />
                        </SubmitButton>
                    </div>
                </div>
            </MessageComponent.Buttons>
        </Widget.Content>
    )
}


export default Failed;