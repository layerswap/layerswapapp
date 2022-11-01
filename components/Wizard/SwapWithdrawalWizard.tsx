import { FC } from "react";
import { SwapWithdrawalStep } from "../../Models/Wizard";
import ExchangeDelay from "./Steps/ExchangeDelayStep";
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
            <WizardItem StepName={SwapWithdrawalStep.ExternalPayment} PositionPercent={90}>
                <ExternalPaymentStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Withdrawal} PositionPercent={90}>
                <WithdrawExchangeStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.OffRampWithdrawal} PositionPercent={90}>
                <WithdrawNetworkStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Processing} PositionPercent={95}>
                <ProccessingStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Delay} PositionPercent={95}>
                <ExchangeDelay />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Success} PositionPercent={100}>
                <SuccessfulStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Failed} PositionPercent={100}>
                <FailedStep />
            </WizardItem>
        </Wizard>
    )
};

export default SwapWithdrawalWizard;