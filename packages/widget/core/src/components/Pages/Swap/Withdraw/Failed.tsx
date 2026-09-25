import { SwapStatus } from '@layerswap/widget-types';
import { FC, useCallback, useEffect } from 'react'
import { useSwapDataState } from '@/context/swap';
import { useIntercom } from 'react-use-intercom';
import QuestionIcon from '@/components//Icons/Question';
import { ErrorHandler } from '@/lib/ErrorHandler';
import { useDepositSettings } from '@/context/depositSettings';

const Failed: FC = () => {
    const { swapDetails } = useSwapDataState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ customAttributes: { swapId: swapDetails?.id } })

    useEffect(() => {
        const error = new Error(`Swap failed: ${swapDetails?.id}`)
        ErrorHandler({
            type: "SwapFailed",
            message: error.message,
            name: error.name,
            stack: error.stack,
            cause: error.cause
        });
    }, [swapDetails?.id]);

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
                        swapDetails?.status == SwapStatus.Expired &&
                        <Expired onGetHelp={startIntercom} />
                    }
                </div>
            </div>

        </>
    )
}
type Props = {
    onGetHelp: () => void
}

const Expired = ({ onGetHelp }: Props) => {
    const { isDepositFlow } = useDepositSettings()
    return (
        <div>
            <span className='text-md text-left text-xs md:text-sm text-primary-text'>The transfer wasn&apos;t completed during the allocated timeframe.</span>
            <span className='text-secondary-text'><span>{` If you've already sent crypto for this ${isDepositFlow ? 'deposit' : 'swap'}, your funds are safe, `}</span><span className='underline hover:cursor-pointer' onClick={() => onGetHelp()}>please contact our support.</span></span>
        </div>
    )
}

export default Failed;