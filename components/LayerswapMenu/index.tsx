import { MenuIcon, ChevronLeft } from "lucide-react";
import { FC, useState } from "react";
import Modal from "../../components/modal/modal";
import IconButton from "../buttons/iconButton";
import HistoryWizard from "./WizardComponents/History";
import { FormWizardProvider, useFormWizardaUpdate, useFormWizardState } from "../../context/formWizardProvider";
import { MenuStep } from "../../Models/Wizard";
import MenuList from "./MenuList";
import Wizard from "../Wizard/Wizard";
import WizardItem from "../Wizard/WizardItem";

const Comp = () => {
    const [openTopModal, setOpenTopModal] = useState(false);

    const [selectedWizardComponent, setSelectedWizardComponent] = useState<string | undefined>(undefined)
    const { goBack, currentStepName } = useFormWizardState()
    const { goToStep } = useFormWizardaUpdate()

    const handleGoBack = () => {
        if (goBack) {
            goBack()
        }
        if (selectedWizardComponent) {
            setSelectedWizardComponent(undefined)
        }
    }

    return <>
        <div className="text-secondary-text cursor-pointer relative">
            {
                <>
                    <IconButton onClick={() => setOpenTopModal(true)} icon={
                        <MenuIcon strokeWidth="2" />
                    }>
                    </IconButton>
                    <Modal
                        modalId="menuModal"
                        show={openTopModal}
                        setShow={setOpenTopModal}
                        header={
                            <div className="inline-flex items-center">
                                {
                                    (selectedWizardComponent || goBack) &&
                                    <div className="-ml-2">
                                        <IconButton onClick={handleGoBack} icon={
                                            <ChevronLeft strokeWidth="2" />
                                        }>
                                        </IconButton>
                                    </div>
                                }
                                <h2>{currentStepName as string}</h2>
                            </div>
                        }
                    >
                        <Wizard wizardId='historyWizard' >
                            <WizardItem StepName={MenuStep.Menu}>
                                <MenuList goToStep={goToStep} />
                            </WizardItem>
                            <HistoryWizard />
                        </Wizard>
                    </Modal>
                </>
            }
        </div >
    </>
}

const LayerswapMenu: FC = () => {
    return (
        <FormWizardProvider noToolBar hideMenu initialStep={MenuStep.Menu}>
            <Comp />
        </FormWizardProvider>
    )
}

export default LayerswapMenu