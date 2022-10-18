import { FC, useCallback } from "react";
import { useFormWizardaUpdate } from "../../context/formWizardProvider";
import { SwapWithdrawalStep } from "../../Models/Wizard";
import ExternalPaymentStep from "./Steps/ExternalPaymentStep";
import FailedStep from "./Steps/FailedStep";
import ProccessingStep from "./Steps/ProccessingStep";
import SuccessfulStep from "./Steps/SuccessfulStep";
import WithdrawExchangeStep from "./Steps/WithdrawExhangeStep";
import WithdrawNetworkStep from "./Steps/WithdrawNetworkStep";
import Wizard from "./Wizard";
import WizardItem from "./WizardItem";

const SwapWithdrawalWizard: FC = () => {

    return (
        <Wizard>
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

export default SwapWithdrawalWizard;