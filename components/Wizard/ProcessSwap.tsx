import { FC, useCallback } from "react";
import { useFormWizardaUpdate } from "../../context/formWizardProvider";
import useProcessSwap from "../../hooks/useProcessSwap";
import { ProcessSwapStep } from "../../Models/Wizard";
import CodeStep from "./Steps/CodeStep";
import EmailStep from "./Steps/EmailStep";
import ExternalPaymentStep from "./Steps/ExternalPaymentStep";
import FailedStep from "./Steps/FailedStep";
import OverviewStep from "./Steps/OverviewStep";
import ProccessingStep from "./Steps/ProccessingStep";
import SuccessfulStep from "./Steps/SuccessfulStep";
import WithdrawExchangeStep from "./Steps/WithdrawExhangeStep";
import WithdrawNetworkStep from "./Steps/WithdrawNetworkStep";
import Wizard from "./Wizard";
import WizardItem from "./WizardItem";

const ProcessSwap: FC = () => {
    const { Email, Code } = useProcessSwap()
    const { goToStep } = useFormWizardaUpdate()
    const GoToEmailStep = useCallback(() => goToStep(ProcessSwapStep.Email), [])

    return (
        <Wizard>
            <WizardItem StepName={ProcessSwapStep.Email}>
                <EmailStep OnNext={Email.onNext} />
            </WizardItem>
            <WizardItem StepName={ProcessSwapStep.Email} GoBack={GoToEmailStep}>
                <CodeStep OnNext={Code.onNext} />
            </WizardItem>
            <WizardItem StepName={ProcessSwapStep.Overview}>
                <OverviewStep />
            </WizardItem>
            <WizardItem StepName={ProcessSwapStep.ExternalPayment}>
                <ExternalPaymentStep />
            </WizardItem>
            <WizardItem StepName={ProcessSwapStep.Withdrawal}>
                <WithdrawExchangeStep />
            </WizardItem>
            <WizardItem StepName={ProcessSwapStep.OffRampWithdrawal}>
                <WithdrawNetworkStep />
            </WizardItem>
            <WizardItem StepName={ProcessSwapStep.Processing}>
                <ProccessingStep />
            </WizardItem>
            <WizardItem StepName={ProcessSwapStep.Success}>
                <SuccessfulStep />
            </WizardItem>
            <WizardItem StepName={ProcessSwapStep.Failed}>
                <FailedStep />
            </WizardItem>
        </Wizard>
    )
};

export default ProcessSwap;