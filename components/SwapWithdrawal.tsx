import { FC, useEffect } from "react";
import { useQueryState } from "../context/query";
import { useSwapDataState, useSwapDataUpdate } from "../context/swap";
import SwapDetails from "./Swap";

const SwapWithdrawal: FC = () => {
    const { swap } = useSwapDataState()
    const { mutateSwap } = useSwapDataUpdate()
    const query = useQueryState()

    useEffect(() => {
        mutateSwap()
    }, [])

    if (!swap)
        return <div className={`pb-6 bg-secondary-900 shadow-card rounded-lg w-full overflow-hidden relative animate-pulse h-[548px]`}>

        </div>

    const key = Object.keys(query).join("")

    return (
        <SwapDetails key={key}/>
    )
};

export default SwapWithdrawal;