import { FC } from "react";
import { FormWizardProvider } from "../../context/formWizardProvider";
import useMainForm from "../../hooks/useMainForm";
import Wizard from "./Wizard";


const Swap: FC = () => {
    const { steps, initialStep } = useMainForm()

    return (
        <FormWizardProvider wizard={steps} initialStep={initialStep} initialLoading={false}>
            <Wizard />
        </FormWizardProvider >
    )
};

export default Swap;