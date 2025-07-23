import { FC, useEffect } from "react";
import { useSwapDataState, useSwapDataUpdate } from "../context/swap";
import SwapDetails from "./Swap";
import { Widget } from "./Widget/Index";
import NotFound from "./Swap/NotFound";

const SwapWithdrawal: FC = () => {
    const { swapBasicData, swapApiError } = useSwapDataState()
    const { mutateSwap } = useSwapDataUpdate()

    useEffect(() => {
        mutateSwap()
    }, [])

    if (!swapBasicData)
        return <Widget>
            <div className={`pb-6 rounded-lg w-full overflow-hidden relative h-[548px]`}>
                {
                    swapApiError &&
                    <NotFound />
                }
            </div>
        </Widget>


    return (
        <SwapDetails type="widget" />
    )
};

export default SwapWithdrawal;