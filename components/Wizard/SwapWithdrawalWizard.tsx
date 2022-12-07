import { Router, useRouter } from "next/router";
import { FC, useCallback } from "react";
import { useFormWizardaUpdate } from "../../context/formWizardProvider";
import { SwapCreateStep, SwapWithdrawalStep } from "../../Models/Wizard";
import ErrorStep from "./Steps/ErrorStep";
import ExchangeDelay from "./Steps/ExchangeDelayStep";
import ExternalPaymentStep from "./Steps/ExternalPaymentStep";
import FailedStep from "./Steps/FailedStep";
import ProccessingStep from "./Steps/ProccessingStep";
import ProccessingWalletTransactionStep from "./Steps/ProccessingWalletTransactionStep";
import SuccessfulStep from "./Steps/SuccessfulStep";
import ConnectWalletStep from "./Steps/Wallet/ConnectWalletStep";
import WithdrawExchangeStep from "./Steps/WithdrawExhangeStep";
import WithdrawNetworkStep from "./Steps/WithdrawNetworkStep";
import Wizard from "./Wizard";
import WizardItem from "./WizardItem";

const SwapWithdrawalWizard: FC = () => {
    const { goToStep } = useFormWizardaUpdate()
    const router = useRouter();
    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    const GoBackToWalletConnect = useCallback(() => goToStep(SwapWithdrawalStep.WalletConnect, "back"), [])

    return (
        <Wizard>
            <WizardItem StepName={SwapWithdrawalStep.ExternalPayment} PositionPercent={90} GoBack={handleGoBack}>
                <ExternalPaymentStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Withdrawal} PositionPercent={90} GoBack={handleGoBack}>
                <WithdrawExchangeStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.OffRampWithdrawal} PositionPercent={90} GoBack={handleGoBack}>
                <WithdrawNetworkStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.WalletConnect} GoBack={handleGoBack} PositionPercent={90} >
                <ConnectWalletStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Processing} PositionPercent={95} GoBack={handleGoBack}>
                <ProccessingStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.ProcessingWalletTransaction} PositionPercent={95} GoBack={handleGoBack}>
                <ProccessingWalletTransactionStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Delay} PositionPercent={95} GoBack={handleGoBack} GoBack={handleGoBack}>
                <ExchangeDelay />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Success} PositionPercent={100} GoBack={handleGoBack} GoBack={handleGoBack}>
                <SuccessfulStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Error} PositionPercent={100}>
                <ErrorStep />
            </WizardItem>
            <WizardItem StepName={SwapWithdrawalStep.Failed} PositionPercent={100} GoBack={handleGoBack} GoBack={handleGoBack}>
                <FailedStep />
            </WizardItem>
        </Wizard>
    )
};

export default SwapWithdrawalWizard;