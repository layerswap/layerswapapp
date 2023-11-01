"use client"
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
import { useSwapTransactionStore } from '../store/zustandStore';

const SwapDetails: FC = () => {
    const { swap } = useSwapDataState()
    const settings = useSettingsState()
    const swapStatus = swap?.status;
    const { setInterval } = useSwapDataUpdate()
    const transactions = useSwapTransactionStore()
    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input)
        ? swap?.transactions?.find(t => t.type === TransactionType.Input)
        : transactions.swapTransactions?.[swap?.id || ''] && transactions.swapTransactions?.[swap?.id || '']?.status !== 1
            ? transactions.swapTransactions?.[swap?.id || ''] : null

    useEffect(() => {
        if (swapStatus)
            setInterval(ResolvePollingInterval(swapStatus))
        return () => setInterval(0)
    }, [swapStatus])

    const sourceNetwork = settings.layers.find(l => l.internal_name === swap?.source_network)

    const currency = settings.currencies.find(c => c.asset === swap?.source_network_asset)
    return (
        <>
            <Widget>
                {
                    ((swapStatus === SwapStatus.UserTransferPending && !swapInputTransaction) || transactions.swapTransactions?.[swap?.id || '']?.status == 1) ?
                        <Withdraw /> : <Processing />
                }
            </Widget>

            {
                process.env.NEXT_PUBLIC_SHOW_GAS_DETAILS === 'true'
                && sourceNetwork
                && currency &&
                <GasDetails network={sourceNetwork} currency={currency} />
            }
        </>
    )
}

export default SwapDetails