import { FC, useEffect } from 'react'
import { Widget } from '../Widget/Index';
import { useSwapDataState, useSwapDataUpdate } from '../../context/swap';
import { ResolvePollingInterval } from '../utils/SwapStatus';
import Withdraw from './Withdraw';
import Processing from './Withdraw/Processing';
import Success from './Withdraw/Success';
import Failed from './Withdraw/Failed';
import Delay from './Withdraw/Delay';
import { TransactionType } from '../../lib/layerSwapApiClient';
import { SwapStatus } from '../../Models/SwapStatus';


const SwapDetails: FC = () => {
    const { swap } = useSwapDataState()
    const swapStatus = swap.status;
    const { setInterval } = useSwapDataUpdate()
    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input) ? swap?.transactions?.find(t => t.type === TransactionType.Input) : JSON.parse(localStorage.getItem("swapTransactions"))[swap?.id]
    useEffect(() => {
        setInterval(ResolvePollingInterval(swapStatus))
        return () => setInterval(0)
    }, [swapStatus])


    return (
        <>
            <Widget>
                {
                    swapStatus === SwapStatus.UserTransferPending &&
                    <Withdraw />
                }
                {
                    (swapInputTransaction
                        || swapStatus === SwapStatus.LsTransferPending)
                    &&
                    <Processing />
                }
                {
                    swapStatus === SwapStatus.Completed &&
                    <Success />
                }
                {
                    swapStatus === SwapStatus.Failed &&
                    <Failed />
                }
                {
                    swapStatus === SwapStatus.UserTransferDelayed &&
                    <Delay />
                }
            </Widget>
        </>
    )
}

export default SwapDetails