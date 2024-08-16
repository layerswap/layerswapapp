import { FC, useCallback, useEffect } from 'react'
import { useSwapDataState } from '../../../context/swap';
import { useIntercom } from 'react-use-intercom';
import { useAuthState } from '../../../context/authContext';
import { SwapStatus } from '../../../Models/SwapStatus';
import { SwapItem } from '../../../lib/layerSwapApiClient';
import { TrackEvent } from '../../../pages/_document';
import QuestionIcon from '../../icons/Question';
import Link from 'next/link';

const Failed: FC = () => {
    const { swapResponse } = useSwapDataState()
    const { swap } = swapResponse || {}
    const { email, userId } = useAuthState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ userId, customAttributes: { swapId: swap?.id, email: email } })

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
            <div>
                <div className="flex items-center gap-2">
                    <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                        <QuestionIcon className="h-7 w-7 text-primary" aria-hidden="true" />
                    </span>
                    <label className="block text-sm md:text-base text-primary-text font-medium">What&apos;s happening?</label>
                </div>
                <div className='mt-4 text-xs md:text-sm text-primary-text'>
                    {
                        swap?.status == SwapStatus.Cancelled &&
                        <Canceled onGetHelp={startIntercom} swap={swap} />
                    }
                    {
                        swap?.status == SwapStatus.Expired &&
                        <Expired onGetHelp={startIntercom} swap={swap} />
                    }
                    {
                        swap?.status == SwapStatus.UserTransferDelayed &&
                        <Delay />
                    }
                </div>
            </div>

        </>
    )
}
type Props = {
    swap: SwapItem
    onGetHelp: () => void
}

const Expired = ({ onGetHelp }: Props) => {
    return (
        <div>
            <span className='text-md text-left text-xs md:text-sm text-primary-text'>The transfer wasn&apos;t completed during the allocated timeframe.</span>
            <span className='text-secondary-text'><span> If you&apos;ve already sent crypto for this swap, your funds are safe, </span><a className='underline hover:cursor-pointer' onClick={() => onGetHelp()}>please contact our support.</a></span>
        </div>
    )
}
const Delay: FC = () => {
    return (
        <div>
            <p className='text-md '><span>This usually means that the exchange needs additional verification.</span>
                <Link target='_blank' href="https://docs.layerswap.io/user-docs/why-is-coinbase-transfer-taking-so-long"
                    className='disabled:text-opacity-40 disabled:bg-primary-900 disabled:cursor-not-allowed ml-1 underline hover:no-underline cursor-pointer'>Learn More</Link></p>
            <ul className="list-inside list-decimal font-light space-y-1 mt-2 text-left text-primary-text ">
                <li>Check your email for details from Coinbase</li>
                <li>Check your Coinbase account&apos;s transfer history</li>
            </ul>
        </div>
    )
}

const Canceled = ({ onGetHelp }: Props) => {
    return (
        <div>
            <p className='text-md text-left text-primary-text'><span>The transaction was cancelled by your request.</span>
                <span className='text-secondary-text'><span> If you&apos;ve already sent crypto for this swap, your funds are safe,</span><a className='underline hover:cursor-pointer' onClick={() => onGetHelp()}> please contact our support.</a></span>
            </p>
        </div>
    )
}

export default Failed;