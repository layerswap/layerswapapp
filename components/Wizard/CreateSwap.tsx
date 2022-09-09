import { FC } from "react";
import { FormWizardProvider } from "../../context/formWizardProvider";
import useCreateSwap from "../../hooks/useCreateSwap";
import { SwapCreateStep } from "../../Models/Wizard";
import MainStep from "./Steps/MainStep";
import Wizard from "./Wizard";
import WizardItem from "./WizardItem";


const CreateSwap: FC = () => {
    const { steps, initialStep } = useCreateSwap()

    return (
        <FormWizardProvider wizard={steps} initialStep={initialStep} initialLoading={false}>
            <Wizard>
                <WizardItem StepName={SwapCreateStep.MainForm}>
                    <MainStep/>
                </WizardItem>
            </Wizard>
        </FormWizardProvider >
    )
};

export default CreateSwap;