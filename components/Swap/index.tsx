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
import { WalletDataProvider } from '../../context/wallet';

type Props = {
    type: "widget" | "contained",
}

const SwapDetails: FC<Props> = ({ type }) => {
    const { swap } = useSwapDataState()
    const settings = useSettingsState()
    const swapStatus = swap?.status;
    const { setInterval } = useSwapDataUpdate()
    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input) ? swap?.transactions?.find(t => t.type === TransactionType.Input) : JSON.parse(localStorage.getItem("swapTransactions") || "{}")?.[swap?.id || '']
    useEffect(() => {
        if (swapStatus)
            setInterval(ResolvePollingInterval(swapStatus))
        return () => setInterval(0)
    }, [swapStatus])

    const sourceNetwork = settings.layers.find(l => l.internal_name === swap?.source_network)

    const currency = settings.currencies.find(c => c.asset === swap?.source_network_asset)

    return (
        <>
            <Container type={type}>
                <WalletDataProvider>
                    {
                        (swapStatus === SwapStatus.UserTransferPending && !swapInputTransaction) ?
                            <Withdraw /> : <Processing />
                    }
                </WalletDataProvider>
            </Container>
            {
                process.env.NEXT_PUBLIC_SHOW_GAS_DETAILS === 'true'
                && sourceNetwork
                && currency &&
                <GasDetails network={sourceNetwork} currency={currency} />
            }
        </>
    )
}

const Container = ({ type, children }: Props & {
    children: JSX.Element | JSX.Element[]
}) => {
    if (type === "widget")
        return <Widget><>{children}</></Widget>
    else
        return <div className="w-full flex flex-col justify-between h-full space-y-5 text-secondary-text">
            {children}
        </div>

}

export default SwapDetails