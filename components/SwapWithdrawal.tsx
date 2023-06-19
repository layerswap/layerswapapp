import { FC, useEffect } from "react";
import { useQueryState } from "../context/query";
import { useSwapDataState, useSwapDataUpdate } from "../context/swap";
import SwapDetails from "./Swap";
import { Widget } from "./Widget/Index";
import NotFound from "./Swap/NotFound";

const SwapWithdrawal: FC = () => {
    const { swap, swapApiError } = useSwapDataState()
    const { mutateSwap } = useSwapDataUpdate()
    const query = useQueryState()

    useEffect(() => {
        mutateSwap()
    }, [])

    if (!swap)
        return <Widget>
            <div className={`pb-6 rounded-lg w-full overflow-hidden relative h-[548px]`}>
                {swapApiError &&
                    <NotFound/>
                }
            </div>
        </Widget>

    const key = Object.keys(query).join("")

    return (
        <SwapDetails key={key} />
    )
};

export default SwapWithdrawal;