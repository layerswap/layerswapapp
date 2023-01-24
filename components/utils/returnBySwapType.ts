import { SwapType } from "../../lib/layerSwapApiClient";

export default function returnBySwapType(swapType: SwapType, onRampCase: any, offRampCase: any, crossChainCase?: any) {

    let value: any

    switch (swapType) {
        case SwapType.OnRamp:
            value = onRampCase
            break;
        case SwapType.OffRamp:
            value = offRampCase
            break;
        case SwapType.CrossChain:
            if (crossChainCase) {
                value = crossChainCase
            } else {
                value = offRampCase
            }
            break;
    }

    return value
}