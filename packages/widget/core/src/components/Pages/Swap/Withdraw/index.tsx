"use client";
import { PendingSwapView } from './Presentation/Page2Sections';
import { FC, useEffect } from "react";
import { Widget } from "../../../Widget/Index";
import { SwapDataProvider, useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import NotFound from "./NotFound";
import SwapDetails from "./SwapDetails";
import { useCallbacks } from "@/context/callbackProvider";
import { SwapResponse } from "@/lib/apiClients/layerSwapApiClient";
import ThemeWrapper from "@/components/themeWrapper";

const Comp: FC = () => {
    const { swapBasicData, swapApiError, swapId } = useSwapDataState()
    const { mutateSwap } = useSwapDataUpdate()
    const { onBackClick } = useCallbacks()

    useEffect(() => {
        mutateSwap()
    }, [])

    if (!swapBasicData)
        return <Widget goBack={onBackClick}>
            <PendingSwapView>
                {
                    swapApiError &&
                    <NotFound swapId={swapId} />
                }
            </PendingSwapView>
        </Widget>


    return (
        <SwapDetails type="widget" />
    )
};

export const SwapWithdrawal: FC<{ initialSwapData?: SwapResponse }> = ({ initialSwapData }) => {
    return (
        <SwapDataProvider initialSwapData={initialSwapData}>
            <ThemeWrapper>
                <Comp />
            </ThemeWrapper>
        </SwapDataProvider >
    )
}
