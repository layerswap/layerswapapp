import { FC } from "react";
import { useSwapDataState } from "../../../../context/swap";
import { SwapType } from "../../../../lib/layerSwapApiClient";
import OffRampSwapConfirmationStep from "./OffRampSwapConfirmationStep";
import OnRampSwapConfirmationStep from "./OnRampSwapConfirmationStep";

const SwapConfirmationStep: FC = () => {
    
    const { swapFormData } = useSwapDataState()

    if (!swapFormData)
        return <></>

    return swapFormData.swapType === SwapType.OffRamp ? <OffRampSwapConfirmationStep /> : <OnRampSwapConfirmationStep />
}

export default SwapConfirmationStep;
