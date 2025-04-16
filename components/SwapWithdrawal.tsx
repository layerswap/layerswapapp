import { FC, useEffect } from "react";
import { SwapDataProvider, useSwapDataState, useSwapDataUpdate } from "../context/swap";
import SwapDetails from "./Swap";
import { Widget } from "./Widget/Index";
import NotFound from "./Swap/NotFound";
import { TimerProvider } from "../context/timerContext";
import { DepositMethodProvider } from "../context/depositMethodContext";
import AppWrapper, { AppPageProps } from "./Layout/AppWrapper";

const Comp: FC = () => {
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
        <SwapDetails type="widget" />
    )
};

const SwapWithdrawal: FC<AppPageProps> = (props) => {
    return (
        <AppWrapper {...props}>
            <SwapDataProvider>
                <TimerProvider>
                    <DepositMethodProvider>
                        <Comp />
                    </DepositMethodProvider>
                </TimerProvider>
            </SwapDataProvider >
        </AppWrapper>
    )
}

export default SwapWithdrawal;