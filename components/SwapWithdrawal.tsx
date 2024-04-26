import { FC, useEffect } from "react";
import { useSwapDataState, useSwapDataUpdate } from "../context/swap";
import SwapDetails from "./Swap";
import { Widget } from "./Widget/Index";
import NotFound from "./Swap/NotFound";
import { BalancesDataProvider } from "../context/balances";

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
        <BalancesDataProvider>
            <SwapDetails swapResponse={swap} type="widget" />
        </BalancesDataProvider>
    )
};

export default SwapWithdrawal;