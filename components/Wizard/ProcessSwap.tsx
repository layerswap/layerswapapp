import { FC } from "react";
import { FormWizardProvider } from "../../context/formWizardProvider";
import useCreateSwap from "../../hooks/useCreateSwap";
import useProcessSwap from "../../hooks/useProcessSwap";
import Wizard from "./Wizard";


const ProcessSwap: FC = () => {
    const { steps, initialStep } = useProcessSwap()
    return (
        <FormWizardProvider wizard={steps} initialStep={initialStep} initialLoading={false}>
            <Wizard />
        </FormWizardProvider >
    )
};

export default ProcessSwap;