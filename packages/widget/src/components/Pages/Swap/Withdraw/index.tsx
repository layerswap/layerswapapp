import { FC, useEffect } from "react";
import { Widget } from "../../../Widget/Index";
import { SwapDataProvider, useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import NotFound from "./NotFound";
import SwapDetails from "./SwapDetails";
import { LayerswapContextProps, LayerswapProvider } from "@/context/LayerswapProvider";
import { TimerProvider } from "@/context/timerContext";

const Comp: FC<{ onBackClick: () => void }> = ({ onBackClick }) => {
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
                    <NotFound onBackClick={onBackClick} />
                }
            </div>
        </Widget>


    return (
        <SwapDetails type="widget" />
    )
};

export const SwapWithdrawal: FC<LayerswapContextProps & { onBackClick: () => void }> = (props) => {
    return (
        <LayerswapProvider {...props}>
            <SwapDataProvider>
                <TimerProvider>
                    <Comp onBackClick={props.onBackClick} />
                </TimerProvider>
            </SwapDataProvider >
        </LayerswapProvider>
    )
}