import { MenuIcon, ChevronLeft } from "lucide-react";
import { FC, useState } from "react";
import IconButton from "../Buttons/iconButton";
import { FormWizardProvider, useFormWizardaUpdate, useFormWizardState } from "../../context/formWizardProvider";
import { MenuStep } from "../../Models/Wizard";
import MenuList from "./MenuList";
import Wizard from "../Wizard/Wizard";
import WizardItem from "../Wizard/WizardItem";
import HistoryList from "../Pages/SwapHistory/History";
import Modal from "../Modal/modal";
import { CampaignsComponent } from "../Pages/Campaigns";

const Comp = () => {

    const { goBack, currentStepName } = useFormWizardState()
    const { goToStep } = useFormWizardaUpdate()

    const [openTopModal, setOpenTopModal] = useState(false);

    const handleModalOpenStateChange = (value: boolean) => {
        setOpenTopModal(value)
        if (value === false) {
            goToStep(MenuStep.Menu)
        }
    }
    const goBackToMenuStep = () => { goToStep(MenuStep.Menu, "back") }

    const handleGoToStep = (step: MenuStep) => {
        goToStep(step)
    }

    return <>
        <div className="text-secondary-text cursor-pointer relative">
            <IconButton className="inline-flex active:animate-press-down" onClick={() => setOpenTopModal(true)} icon={
                <MenuIcon strokeWidth="2" />
            }>
            </IconButton>
            <Modal
                modalId="menuModal"
                show={openTopModal}
                setShow={handleModalOpenStateChange}
                header={
                    <div className="inline-flex items-center">
                        {
                            goBack &&
                            <div className="-ml-2">
                                <IconButton className="inline-flex" onClick={goBack} icon={
                                    <ChevronLeft strokeWidth="2" />
                                }>
                                </IconButton>
                            </div>
                        }
                        <h2>{currentStepName as string}</h2>
                    </div>
                }
            >
                <Wizard wizardId='menuWizard' >
                    <WizardItem StepName={MenuStep.Menu} inModal>
                        <MenuList goToStep={handleGoToStep} />
                    </WizardItem>
                    <WizardItem StepName={MenuStep.Transactions} GoBack={goBackToMenuStep} className="h-full" inModal>
                        <HistoryList onNewTransferClick={() => handleModalOpenStateChange(false)} />
                    </WizardItem>
                    <WizardItem StepName={MenuStep.Campaigns} GoBack={goBackToMenuStep} className="h-full" inModal>
                        <CampaignsComponent />
                    </WizardItem>
                </Wizard>
            </Modal>
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