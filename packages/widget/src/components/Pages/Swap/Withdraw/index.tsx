"use client";
import { FC, useEffect } from "react";
import { Widget } from "../../../Widget/Index";
import { SwapDataProvider, useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import NotFound from "./NotFound";
import SwapDetails from "./SwapDetails";
import { useBackClickCallback } from "@/context/callbackProvider";

const Comp: FC = () => {
    const { swapBasicData, swapApiError, swapId } = useSwapDataState()
    const { mutateSwap } = useSwapDataUpdate()
    const triggerOnBackClickCallback = useBackClickCallback()

    useEffect(() => {
        mutateSwap()
    }, [])

    if (!swapBasicData)
        return <Widget goBack={triggerOnBackClickCallback}>
            <div className={`rounded-lg w-full overflow-hidden relative h-[548px]`}>
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

export const SwapWithdrawal: FC = () => {
    return (
        <SwapDataProvider>
            <Comp />
        </SwapDataProvider >
    )
}