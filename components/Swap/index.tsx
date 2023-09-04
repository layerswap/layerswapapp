import { FC, useEffect } from 'react'
import { Widget } from '../Widget/Index';
import { useSwapDataState, useSwapDataUpdate } from '../../context/swap';
import { GetSwapStep, ResolvePollingInterval } from '../utils/SwapStatus';
import { SwapStep } from '../../Models/Wizard';
import Withdraw from './Withdraw';
import Processing from './Withdraw/Processing';
import Success from './Withdraw/Success';
import Failed from './Withdraw/Failed';
import Delay from './Withdraw/Delay';


const SwapDetails: FC = () => {
    const { swap } = useSwapDataState()
    const swapStep = GetSwapStep(swap)
    const { setInterval } = useSwapDataUpdate()

    useEffect(() => {
        setInterval(ResolvePollingInterval(swapStep))
        return () => setInterval(0)
    }, [swapStep])

    return (
        <>
            <Widget>
                {
                    swapStep === SwapStep.UserTransferPending &&
                    <Withdraw />
                }
                {
                    (swapStep === SwapStep.TransactionDetected
                        || swapStep === SwapStep.LSTransferPending
                        || swapStep === SwapStep.TransactionDone)
                    &&
                    <Processing />
                }
                {
                    swapStep === SwapStep.Success &&
                    <div>
                        <Processing />
                        <Success />
                    </div>
                }
                {
                    swapStep === SwapStep.Failed &&
                    <div>
                        <Processing />
                        <Failed />
                    </div>
                }
                {
                    swapStep === SwapStep.Delay &&
                    <Delay />
                }
            </Widget>
        </>
    )
}

export default SwapDetails