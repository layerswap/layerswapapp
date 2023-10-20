import { FC, useEffect } from "react";
import { useSwapDataState, useSwapDataUpdate } from "../context/swap";
import SwapDetails from "./Swap";
import { Widget } from "./Widget/Index";
import NotFound from "./Swap/NotFound";
import { WalletDataProvider } from "../context/wallet";

const SwapWithdrawal: FC = () => {
    const { swap, swapApiError } = useSwapDataState()
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
        <WalletDataProvider>
            <SwapDetails />
        </WalletDataProvider>
    )
};

export default SwapWithdrawal;