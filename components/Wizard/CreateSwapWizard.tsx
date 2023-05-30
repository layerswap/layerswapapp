import { FC, useCallback } from "react";
import { useFormWizardaUpdate, useFormWizardState } from "../../context/formWizardProvider";
import useCreateSwap from "../../hooks/useCreateSwap";
import { SwapCreateStep } from "../../Models/Wizard";
import ActiveSwapLimit from "./Steps/ActiveSwapLimitStep";
import CodeStep from "./Steps/CodeStep";
import EmailStep from "./Steps/EmailStep";
import ErrorStep from "./Steps/ErrorStep";
import MainStep from "./Steps/MainStep/index";
import Wizard from "./Wizard";
import WizardItem from "./WizardItem";
import { CurrencyPendingSwapStep } from "./Steps/PendingSwapsStep";
import CoinbaseAccountConnectStep from "./Steps/CoinbaseAccountConnectStep";
import Coinbase2FA from "../Coinbase2FA";
import { useRouter } from "next/router";

const CreateSwap: FC = () => {
    const { MainForm, Email, Code, CoinbaseAuthorize } = useCreateSwap()
    const { error } = useFormWizardState()
    const { goToStep } = useFormWizardaUpdate()
    const router = useRouter();

    const GoBackToMainStep = useCallback(() => goToStep(SwapCreateStep.MainForm, "back"), [])
    const GoBackToEmailStep = useCallback(() => goToStep(SwapCreateStep.Email, "back"), [])
    const GoBackFromError = useCallback(() => goToStep(error?.Step, "back"), [error])

    return (
        <Wizard>
            <WizardItem StepName={SwapCreateStep.MainForm} PositionPercent={MainForm.positionPercent} key={SwapCreateStep.MainForm}>
                <MainStep />
            </WizardItem>
            <WizardItem StepName={SwapCreateStep.Email} GoBack={GoBackToMainStep} PositionPercent={Email.positionPercent} key={SwapCreateStep.Email}>
                <EmailStep OnNext={Email.onNext} />
            </WizardItem>
            <WizardItem StepName={SwapCreateStep.Code} GoBack={GoBackToEmailStep} PositionPercent={Code.positionPercent} key={SwapCreateStep.Code}>
                <CodeStep OnNext={Code.onNext} />
            </WizardItem>
            <WizardItem StepName={SwapCreateStep.PendingSwaps} GoBack={GoBackToMainStep} PositionPercent={MainForm.positionPercent + 10} key={SwapCreateStep.PendingSwaps}>
                <CurrencyPendingSwapStep  />
            </WizardItem>
            <WizardItem StepName={SwapCreateStep.AuthorizeCoinbaseWithdrawal} GoBack={GoBackToMainStep} PositionPercent={MainForm.positionPercent + 10} key={SwapCreateStep.AuthorizeCoinbaseWithdrawal}>
                <CoinbaseAccountConnectStep stickyFooter={true} onAuthorized={CoinbaseAuthorize.onNext} onDoNotConnect={CoinbaseAuthorize.onNext} />
            </WizardItem>
            <WizardItem StepName={SwapCreateStep.TwoFactor} GoBack={GoBackToMainStep} PositionPercent={MainForm.positionPercent} key={SwapCreateStep.TwoFactor}>
                <Coinbase2FA onSuccess={async (swapId) => { await router.push(`/swap/${swapId}`) }} />
            </WizardItem>
            <WizardItem StepName={SwapCreateStep.ActiveSwapLimit} GoBack={GoBackToMainStep} PositionPercent={MainForm.positionPercent} key={SwapCreateStep.ActiveSwapLimit}>
                <ActiveSwapLimit />
            </WizardItem>
            <WizardItem StepName={SwapCreateStep.Error} GoBack={GoBackFromError} PositionPercent={100} key={SwapCreateStep.Error}>
                <ErrorStep />
            </WizardItem>
        </Wizard>
    )
}

export default CreateSwap;