import { FC, useEffect } from "react";
import { Widget } from "../../../Widget/Index";
import { SwapDataProvider, useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import NotFound from "./NotFound";
import SwapDetails from "./SwapDetails";
import { LayerswapContextProps, LayerswapProvider } from "@/context/LayerswapProvider";

const Comp: FC = () => {
    const { swapBasicData, swapApiError, swapId } = useSwapDataState()
    const { mutateSwap } = useSwapDataUpdate()

    useEffect(() => {
        mutateSwap()
    }, [])

    if (!swapBasicData)
        return <Widget>
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

export const SwapWithdrawal: FC<LayerswapContextProps> = (props) => {
    return (
        <LayerswapProvider {...props}>
            <SwapDataProvider>
                <Comp />
            </SwapDataProvider >
        </LayerswapProvider>
    )
}