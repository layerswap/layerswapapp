import { FC, useCallback } from "react";
import { useFormWizardaUpdate } from "../../context/formWizardProvider";
import useSwapWithdrawal from "../../hooks/useSwapWithdrawal";
import { SwapWithdrawalStep } from "../../Models/Wizard";
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

const SwapWithdrawal: FC = () => {
    const { Email, Code } = useSwapWithdrawal()
    const { goToStep } = useFormWizardaUpdate()
    const GoToEmailStep = useCallback(() => goToStep(SwapWithdrawalStep.Email), [])

    return (
        <Wizard>
            <WizardItem StepName={SwapWithdrawalStep.Email}>
                <EmailStep OnNext={Email.onNext} />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Email} GoBack={GoToEmailStep}>
                <CodeStep OnNext={Code.onNext} />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Overview}>
                <OverviewStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.ExternalPayment}>
                <ExternalPaymentStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Withdrawal}>
                <WithdrawExchangeStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.OffRampWithdrawal}>
                <WithdrawNetworkStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Processing}>
                <ProccessingStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Success}>
                <SuccessfulStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Failed}>
                <FailedStep />
            </WizardItem>
        </Wizard>
    )
};

export default SwapWithdrawal;