import { FC, useEffect } from "react";
import { FormWizardProvider } from "../context/formWizardProvider";
import { useQueryState } from "../context/query";
import { useSwapDataState, useSwapDataUpdate } from "../context/swap";
import KnownInternalNames from "../lib/knownIds";
import { SwapStatus } from "../Models/SwapStatus";
import { SwapWithdrawalStep } from "../Models/Wizard";
import { GetSwapStatusStep } from "./utils/SwapStatus";
import SwapWithdrawalWizard from "./Wizard/SwapWithdrawalWizard";
import { Widget } from "./Widget/Index";
import Withdraw from "./Wizard/Steps/Withdraw/Index";

const SwapWithdrawal: FC = () => {
    const { swap } = useSwapDataState()
    const { mutateSwap } = useSwapDataUpdate()
    const query = useQueryState()

    useEffect(() => {
        mutateSwap()
    }, [])

    if (!swap)
        return <div className={`pb-6 bg-darkblue-900 shadow-card rounded-lg w-full overflow-hidden relative animate-pulse h-[548px]`}>

        </div>

    const key = Object.keys(query).join("")

    return (
        <Withdraw key={key}/>
    )
};

export default SwapWithdrawal;