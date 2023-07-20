import { FC, useEffect } from "react";
import { useQueryState } from "../context/query";
import { useSwapDataState, useSwapDataUpdate } from "../context/swap";
import SwapDetails from "./Swap";
import { Widget } from "./Widget/Index";
import NotFound from "./Swap/NotFound";
import { WalletDataProvider } from "../context/wallet";

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
                    <NotFound />
                }
            </div>
        </Widget>

    const key = Object.keys(query).join("")

    return (
        <WalletDataProvider>
            <SwapDetails key={key} />
        </WalletDataProvider>
    )
};

export default SwapWithdrawal;