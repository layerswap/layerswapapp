import { FC, useEffect } from "react";
import { Widget } from "../../../Widget/Index";
import { SwapDataProvider, useSwapDataState, useSwapDataUpdate } from "../../../../context/swap";
import NotFound from "./NotFound";
import SwapDetails from "./SwapDetails";
import AppWrapper, { AppPageProps } from "../../../AppWrapper";
import { TimerProvider } from "../../../../context/timerContext";
import { DepositMethodProvider } from "../../../../context/depositMethodContext";


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

export const SwapWithdrawal: FC<AppPageProps> = (props) => {
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