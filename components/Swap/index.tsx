import { FC, useEffect } from 'react'
import { Widget } from '../Widget/Index';
import { useSwapDataState, useSwapDataUpdate } from '../../context/swap';
import { ResolvePollingInterval } from '../utils/SwapStatus';
import Withdraw from './Withdraw';
import Processing from './Withdraw/Processing';
import { TransactionType } from '../../lib/layerSwapApiClient';
import { SwapStatus } from '../../Models/SwapStatus';
import GasDetails from '../gasDetails';
import { useSettingsState } from '../../context/settings';


const SwapDetails: FC = () => {
    const { swap } = useSwapDataState()
    const settings = useSettingsState()
    const swapStatus = swap.status;
    const { setInterval } = useSwapDataUpdate()
    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input) ? swap?.transactions?.find(t => t.type === TransactionType.Input) : JSON.parse(localStorage.getItem("swapTransactions"))?.[swap?.id]
    useEffect(() => {
        setInterval(ResolvePollingInterval(swapStatus))
        return () => setInterval(0)
    }, [swapStatus])


    return (
        <>
            <Widget>
                {
                    swapStatus === SwapStatus.UserTransferPending && !swapInputTransaction &&
                    <Withdraw />
                }
                {
                    (swapInputTransaction)
                    &&
                    <Processing />
                }
            </Widget>

            {
                process.env.NEXT_PUBLIC_SHOW_GAS_DETAILS === 'true' &&
                <GasDetails network={settings.layers.find(l => l.internal_name === swap.source_network)} currency={settings.currencies.find(c => c.asset === swap.source_network_asset)} />
            }
        </>
    )
}

export default SwapDetails