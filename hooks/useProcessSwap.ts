import CodeStep from "../components/Wizard/Steps/CodeStep";
import EmailStep from "../components/Wizard/Steps/EmailStep";
import ExternalPaymentStep from "../components/Wizard/Steps/ExternalPaymentStep";
import FailedStep from "../components/Wizard/Steps/FailedStep";
import OverviewStep from "../components/Wizard/Steps/OverviewStep";
import ProccessingStep from "../components/Wizard/Steps/ProccessingStep";
import SuccessfulStep from "../components/Wizard/Steps/SuccessfulStep";
import WithdrawExchangeStep from "../components/Wizard/Steps/WithdrawExhangeStep";
import WithdrawNetworkStep from "../components/Wizard/Steps/WithdrawNetworkStep";
import {  ProcessSwapStep, WizardStep } from "../Models/Wizard";



type WizardData = {
    steps: WizardStep<ProcessSwapStep>[],
    initialStep: ProcessSwapStep
}

const useCreateSwap = (): WizardData => {

    const Email: WizardStep<ProcessSwapStep> = {
        Content: EmailStep,
        Name: ProcessSwapStep.Code,
        onNext: async () => ProcessSwapStep.Code,
        positionPercent: 70
    }
    const Code: WizardStep<ProcessSwapStep> = {
        Content: CodeStep,
        Name: ProcessSwapStep.Code,
        onNext: async () => ProcessSwapStep.Overview,
        onBack: () => ProcessSwapStep.Email,
        positionPercent: 75
    }
    const Overview: WizardStep<ProcessSwapStep> = {
        Content: OverviewStep,
        Name: ProcessSwapStep.Overview,
        positionPercent: 80
    }
    const ExternalPayment: WizardStep<ProcessSwapStep> = {
        Content: ExternalPaymentStep,
        Name: ProcessSwapStep.ExternalPayment,
        positionPercent: 90
    }

    const Withdrawal: WizardStep<ProcessSwapStep> = {
        Content: WithdrawExchangeStep,
        Name: ProcessSwapStep.Withdrawal,
        positionPercent: 90
    }
    const OffRampWithdrawal: WizardStep<ProcessSwapStep> = {
        Content: WithdrawNetworkStep,
        Name: ProcessSwapStep.OffRampWithdrawal,
        positionPercent: 90
    }
    const Processing: WizardStep<ProcessSwapStep> = {
        Content: ProccessingStep,
        Name: ProcessSwapStep.Processing,
        positionPercent: 95
    }
    const Success: WizardStep<ProcessSwapStep> = {
        Content: SuccessfulStep,
        Name: ProcessSwapStep.Success,
        positionPercent: 100
    }
    const Failed: WizardStep<ProcessSwapStep> = {
        Content: FailedStep,
        Name: ProcessSwapStep.Failed,
        positionPercent: 100
    }

    return { steps: [Email, Code, Overview, ExternalPayment, Withdrawal, OffRampWithdrawal, Processing, Success, Failed], initialStep: ProcessSwapStep.Overview }
}

export default useCreateSwap;