import FailedStep from "../components/Wizard/Steps/FailedStep";
import ProccessingStep from "../components/Wizard/Steps/ProccessingStep";
import SuccessfulStep from "../components/Wizard/Steps/SuccessfulStep";
import WithdrawExchangeStep from "../components/Wizard/Steps/WithdrawExhangeStep";
import { SwapWithdrawalStep, WizardStep } from "../Models/Wizard";

const useSwapWithdrawal = () => {

    const Withdrawal: WizardStep<SwapWithdrawalStep> = {
        Content: WithdrawExchangeStep,
        Name: SwapWithdrawalStep.Withdrawal,
        positionPercent: 90
    }
    const Processing: WizardStep<SwapWithdrawalStep> = {
        Content: ProccessingStep,
        Name: SwapWithdrawalStep.Processing,
        positionPercent: 95
    }
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

    return { Withdrawal, Processing, Success, Failed }
}

export default useSwapWithdrawal;