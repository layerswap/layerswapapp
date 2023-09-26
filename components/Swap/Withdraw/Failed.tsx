import { FC, useCallback, useEffect } from 'react'
import { useSwapDataState } from '../../../context/swap';
import { useIntercom } from 'react-use-intercom';
import { useAuthState } from '../../../context/authContext';
import MessageComponent from '../../MessageComponent';
import { SwapStatus } from '../../../Models/SwapStatus';
import { SwapItem } from '../../../lib/layerSwapApiClient';
import { TrackEvent } from '../../../pages/_document';
import Widget from '../../Wizard/Widget';
import Cancell from '../../icons/Cancell';

const Failed: FC = () => {
    const { swap } = useSwapDataState()
    const { email, userId } = useAuthState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email, userId: userId, customAttributes: { swapId: swap?.id } })

    useEffect(() => {
        window.plausible && plausible(TrackEvent.SwapFailed)
    }, [])

    const startIntercom = useCallback(() => {
        boot();
        show();
        updateWithProps()
    }, [boot, show, updateWithProps])

    return (
        <>
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
                            <div className='p-3 bg-secondary-700 text-white rounded-lg text-left border border-secondary-500'>
                                <div className="flex items-center gap-2">
                                    <Cancell className="h-10 w-10" />
                                    <label className="block text-sm md:text-base font-medium">Swap expired</label>
                                </div>
                                <div className='mt-4 ml-1 text-left text-xs md:text-sm'>
                                    <span className='text-md text-left text-xs md:text-sm text-white'>The transfer wasn&apos;t completed during the allocated timeframe.</span>
                                    <span className='text-primary-text'><span> If you&apos;ve already sent crypto for this swap, your funds are safe, </span><a className='underline hover:cursor-pointer' onClick={() => onGetHelp()}>please contact our support.</a></span>
                                </div>
                            </div>
                        </>
                    }
                </MessageComponent.Description>
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
                                <div className="flex items-center gap-2">
                                    <Cancell className="h-10 w-10" />
                                    <label className="block text-sm md:text-base font-medium">Swap cancelled</label>
                                </div>
                                <div className='mt-4 ml-1 text-xs md:text-sm text-white'>
                                    <p className='text-md text-left'><span>The transaction was cancelled by your request.</span>
                                        <span className='text-primary-text'><span> If you&apos;ve already sent crypto for this swap, your funds are safe,</span><a className='underline hover:cursor-pointer' onClick={() => onGetHelp()}> please contact our support.</a></span>
                                    </p>
                                </div>
                            </div>
                        </>
                    }
                </MessageComponent.Description>
            </MessageComponent>
        </Widget.Content>
    )
}

export default Failed;