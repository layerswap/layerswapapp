"use client";
import { FC, useEffect } from "react";
import { Widget } from "../../../Widget/Index";
import { SwapDataProvider, useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import NotFound from "./NotFound";
import SwapDetails from "./SwapDetails";
import { LayerswapContextProps, LayerswapProvider } from "@/context/LayerswapProvider";
import { TimerProvider } from "@/context/timerContext";

const Comp: FC = () => {
    const { swapBasicData, swapApiError, swapId } = useSwapDataState()
    const { mutateSwap } = useSwapDataUpdate()

    useEffect(() => {
        mutateSwap()
    }, [])

    if (!swapBasicData)
        return <Widget>
            <div className={`pb-6 rounded-lg w-full overflow-hidden relative h-[548px]`}>
                {
                    swapApiError &&
                    <NotFound swapId={swapId} />
                }
            </div>
        </Widget>


    return (
        <SwapDetails type="widget" />
    )
};

export const SwapWithdrawal: FC<LayerswapContextProps> = (props) => {
    return (
        <LayerswapProvider {...props}>
            <SwapDataProvider>
                <TimerProvider>
                    <Comp />
                </TimerProvider>
            </SwapDataProvider >
        </LayerswapProvider>
    )
}