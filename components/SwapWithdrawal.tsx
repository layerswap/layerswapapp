import { useRouter } from "next/router";
import { FC, useCallback } from "react";
import useSWR from "swr";
import { FormWizardProvider, useFormWizardaUpdate } from "../context/formWizardProvider";
import { useSettingsState } from "../context/settings";
import useSwapWithdrawal from "../hooks/useSwapWithdrawal";
import LayerSwapApiClient, { SwapItemResponse, SwapType } from "../lib/layerSwapApiClient";
import { DepositFlow } from "../Models/Exchange";
import { SwapStatus } from "../Models/SwapStatus";
import { SwapWithdrawalStep } from "../Models/Wizard";
import SwapWithdrawalWizard from "./Wizard/SwapWithdrawalWizard";


const SwapWithdrawal: FC = () => {

    const { data: settings } = useSettingsState()
    const { exchanges } = settings

    const router = useRouter();
    const { swapId } = router.query;

    const layerswapApiClient = new LayerSwapApiClient()
    const swap_details_endpoint = `${LayerSwapApiClient.apiBaseEndpoint}/api/swaps/${swapId}`

    const { data: swap } = useSWR<SwapItemResponse>(swapId ? swap_details_endpoint : null, layerswapApiClient.fetcher)

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
    else {
        if (swap?.data?.type === SwapType.OffRamp)
            initialStep = SwapWithdrawalStep.OffRampWithdrawal ///TODO only for coinbase, implement other flows
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