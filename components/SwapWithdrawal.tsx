import { FC, useEffect } from "react";
import { useSwapDataState, useSwapDataUpdate } from "../context/swap";
import SwapDetails from "./Swap";
import { Widget } from "./Widget/Index";
import NotFound from "./Swap/NotFound";
import { BalancesDataProvider } from "../context/balances";
import { ImtblPassportProvider } from "./ImtblPassportProvider";

const SwapWithdrawal: FC = () => {
    const { swapResponse: swap, swapApiError } = useSwapDataState()
    const { mutateSwap } = useSwapDataUpdate()

    useEffect(() => {
        mutateSwap()
    }, [])

    if (!swap)
        return <Widget>
            <div className={`pb-6 rounded-lg w-full overflow-hidden relative h-[548px]`}>
                {swapApiError &&
                    <NotFound />
                }
            </div>
        </Widget>


    return (
        <ImtblPassportProvider from={swap.swap.source_network}>
            <BalancesDataProvider>
                <SwapDetails type="widget" />
            </BalancesDataProvider>
        </ImtblPassportProvider>
    )
};

export default SwapWithdrawal;