import FailedStep from "../components/Wizard/Steps/FailedStep";
import SuccessfulStep from "../components/Wizard/Steps/SuccessfulStep";
import WithdrawExchangeStep from "../components/Wizard/Steps/WithdrawExchangeStep";
import { SwapWithdrawalStep, WizardStep } from "../Models/Wizard";

const useSwapWithdrawal = () => {

    const Success: WizardStep<SwapWithdrawalStep> = {
        Content: SuccessfulStep,
        Name: SwapWithdrawalStep.Success,
        positionPercent: 100
    }
    const Failed: WizardStep<SwapWithdrawalStep> = {
        Content: FailedStep,
        Name: SwapWithdrawalStep.Failed,
        positionPercent: 100
    }

    return { Success, Failed }
}

export default useSwapWithdrawal;