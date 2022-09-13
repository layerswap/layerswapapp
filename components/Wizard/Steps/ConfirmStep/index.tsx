import { FC } from "react";
import { useSwapDataState } from "../../../../context/swap";
import OffRampSwapConfirmationStep from "./OffRampSwapConfirmationStep";
import OnRampSwapConfirmationStep from "./OnRampSwapConfirmationStep";

const SwapConfirmationStep: FC = () => {
    const { swapFormData, swap } = useSwapDataState()

    if (!swapFormData)
        return <></>

    return swapFormData.swapType === "offramp" ? <OffRampSwapConfirmationStep /> : <OnRampSwapConfirmationStep />
}

export default SwapConfirmationStep;
