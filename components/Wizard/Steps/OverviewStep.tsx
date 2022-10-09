import { useRouter } from 'next/router';
import { FC, useEffect } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { useSwapDataUpdate } from '../../../context/swap';
import TokenService from '../../../lib/TokenService';
import { SwapStatus } from '../../../Models/SwapStatus';
import { SwapWithdrawalStep, SwapWizardSteps } from '../../../Models/Wizard';
import toast from "react-hot-toast";
import { SwapType } from '../../../lib/layerSwapApiClient';
import { useSettingsState } from '../../../context/settings';
import { DepositFlow } from '../../../Models/Exchange';

const OverviewStep: FC = () => {
    const { setLoading: setLoadingWizard, goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const { currentStepName: currentStep } = useFormWizardState<SwapWithdrawalStep>()
    const { data } = useSettingsState()
    const { exchanges } = data
    const router = useRouter();
    const { swapId } = router.query;

    const { getSwap } = useSwapDataUpdate()

    useEffect(() => {
        (async () => {
            try {
                if (currentStep !== SwapWithdrawalStep.Overview)
                    return true
                const authData = TokenService.getAuthData();
                if (!authData) {
                    goToStep(SwapWithdrawalStep.Email)
                    setLoadingWizard(false)
                    return;
                }
                const swap = await getSwap(swapId.toString())
                const swapStatus = swap?.data?.status;

                const exchange = exchanges.find(e => e.currencies.some(ec => ec.id === swap.data.exchange_currency_id))

                if (swapStatus == SwapStatus.Completed)
                    goToStep(SwapWithdrawalStep.Success)
                else if (swapStatus == SwapStatus.Failed || swapStatus == SwapStatus.Cancelled || swapStatus === SwapStatus.Expired)
                    goToStep(SwapWithdrawalStep.Failed)
                else {
                    if (swap?.data?.type === SwapType.OffRamp)
                        goToStep(SwapWithdrawalStep.OffRampWithdrawal) ///TODO only for coinbase, implement other flows
                    else if (exchange?.deposit_flow === DepositFlow.Manual)
                        goToStep(SwapWithdrawalStep.Withdrawal)
                    else if (exchange?.deposit_flow === DepositFlow.External)
                        goToStep(SwapWithdrawalStep.ExternalPayment)
                    else
                        goToStep(SwapWithdrawalStep.Processing)
                }

                setTimeout(() => {
                    setLoadingWizard(false)
                }, 500);
            }
            catch (e) {
                goToStep(SwapWithdrawalStep.Failed)
                toast.error(e.message)
                setTimeout(() => {
                    setLoadingWizard(false)
                }, 500);
            }

        })()
    }, [swapId, currentStep, router.query])

    return (
        <>
            <div className="w-full px-3 md:px-8 py-12 grid grid-flow-row">
            </div>
        </>
    )
}

export default OverviewStep;