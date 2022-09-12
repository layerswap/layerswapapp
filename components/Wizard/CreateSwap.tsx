import { FC, useCallback } from "react";
import { FormWizardProvider, useFormWizardaUpdate } from "../../context/formWizardProvider";
import useCreateSwap from "../../hooks/useCreateSwap";
import { SwapCreateStep } from "../../Models/Wizard";
import AccountConnectStep from "./Steps/AccountConnectStep";
import APIKeyStep from "./Steps/APIKeyStep";
import CodeStep from "./Steps/CodeStep";
import EmailStep from "./Steps/EmailStep";
import MainStep from "./Steps/MainStep";
import OfframpAccountConnectStep from "./Steps/OfframpAccountConnectStep";
import SwapConfirmationStep from "./Steps/SwapConfirmationStep";
import Wizard from "./Wizard";
import WizardItem from "./WizardItem";


const CreateSwap: FC = () => {
    const { MainForm, Email, Code } = useCreateSwap()
    const { goToStep } = useFormWizardaUpdate()

    const GoToMainStep = useCallback(() => goToStep(SwapCreateStep.MainForm), [])
    const GoToEmailStep = useCallback(() => goToStep(SwapCreateStep.Email), [])

    return (
        <Wizard>
            <WizardItem StepName={SwapCreateStep.MainForm}>
                <MainStep OnSumbit={MainForm.onNext} />
            </WizardItem>
            <WizardItem StepName={SwapCreateStep.Email} GoBack={GoToMainStep} PositionPercent={20}>
                <EmailStep OnNext={Email.onNext} />
            </WizardItem>
            <WizardItem StepName={SwapCreateStep.Code} GoBack={GoToEmailStep} PositionPercent={20}>
                <CodeStep OnNext={Code.onNext} />
            </WizardItem>
            <WizardItem StepName={SwapCreateStep.OAuth} GoBack={GoToMainStep}>
                <AccountConnectStep />
            </WizardItem>
            <WizardItem StepName={SwapCreateStep.OffRampOAuth} GoBack={GoToMainStep}>
                <OfframpAccountConnectStep />
            </WizardItem>
            <WizardItem StepName={SwapCreateStep.ApiKey} GoBack={GoToMainStep}>
                <APIKeyStep />
            </WizardItem>
            <WizardItem StepName={SwapCreateStep.Confirm} GoBack={GoToMainStep}>
                <SwapConfirmationStep />
            </WizardItem>
        </Wizard>
    )
}

export default CreateSwap;