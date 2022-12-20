import { useRouter } from "next/router";
import { FC, useEffect } from "react";
import { FormWizardProvider } from "../context/formWizardProvider";
import { useQueryState } from "../context/query";
import { useSettingsState } from "../context/settings";
import { useSwapDataState, useSwapDataUpdate } from "../context/swap";
import { SwapType } from "../lib/layerSwapApiClient";
import { SwapWithdrawalStep } from "../Models/Wizard";
import { GetSwapStatusStep } from "./utils/SwapStatus";
import SwapWithdrawalWizard from "./Wizard/SwapWithdrawalWizard";

const SwapWithdrawal: FC = () => {
    const settings = useSettingsState()
    const { exchanges, networks } = settings
    const { swap } = useSwapDataState()
    const { mutateSwap } = useSwapDataUpdate()
    const query = useQueryState()
    const router = useRouter()
    useEffect(() => {
        mutateSwap()
    }, [])

    if (!swap)
        return <div className={`pb-6 bg-darkblue shadow-card rounded-lg w-full overflow-hidden relative animate-pulse h-[548px]`}>

        </div>

    let initialStep: SwapWithdrawalStep = GetSwapStatusStep(swap);

    const key = Object.keys(query).join("")

    return (
        <FormWizardProvider initialStep={initialStep} initialLoading={true} key={key}>
            <SwapWithdrawalWizard />
        </FormWizardProvider>
    )
};

export default SwapWithdrawal;