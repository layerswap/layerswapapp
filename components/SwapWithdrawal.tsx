import { FC } from "react";
import { FormWizardProvider } from "../context/formWizardProvider";
import { useSettingsState } from "../context/settings";
import { useSwapDataState } from "../context/swap";
import { SwapType } from "../lib/layerSwapApiClient";
import { DepositFlow } from "../Models/Exchange";
import { SwapStatus } from "../Models/SwapStatus";
import { SwapWithdrawalStep } from "../Models/Wizard";
import SwapWithdrawalWizard from "./Wizard/SwapWithdrawalWizard";


const SwapWithdrawal: FC = () => {
    const { data: settings } = useSettingsState()
    const { exchanges } = settings
    const { swap } = useSwapDataState()

    if (!swap)
        return <div className={`pb-6 bg-darkblue shadow-card rounded-lg w-full overflow-hidden relative animate-pulse h-[548px]`}>

        </div>
    const swapStatus = swap?.data?.status;
    const exchange = exchanges.find(e => e.currencies.some(ec => ec.id === swap.data.exchange_currency_id))

    let initialStep: SwapWithdrawalStep;
    if (swapStatus == SwapStatus.Completed)
        initialStep = SwapWithdrawalStep.Success
    else if (swapStatus == SwapStatus.Failed || swapStatus == SwapStatus.Cancelled || swapStatus === SwapStatus.Expired)
        initialStep = SwapWithdrawalStep.Failed
    else if (swapStatus == SwapStatus.UserTransferDelayed)
        initialStep = SwapWithdrawalStep.Delay
    else {
        if (swap?.data?.type === SwapType.OffRamp)
            initialStep = SwapWithdrawalStep.OffRampWithdrawal
        else if (exchange?.deposit_flow === DepositFlow.Manual)
            initialStep = SwapWithdrawalStep.Withdrawal
        else if (exchange?.deposit_flow === DepositFlow.External)
            initialStep = SwapWithdrawalStep.ExternalPayment
        else
            initialStep = SwapWithdrawalStep.Processing
    }

    return (
        <FormWizardProvider initialStep={initialStep} initialLoading={true}>
            <SwapWithdrawalWizard />
        </FormWizardProvider>
    )
};

export default SwapWithdrawal;