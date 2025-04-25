import { MenuIcon, ChevronLeft } from "lucide-react";
import { FC, useState } from "react";
import IconButton from "../Buttons/iconButton";
import { FormWizardProvider, useFormWizardaUpdate, useFormWizardState } from "../../context/formWizardProvider";
import { MenuStep } from "../../Models/Wizard";
import MenuList from "./MenuList";
import Wizard from "../Wizard/Wizard";
import WizardItem from "../Wizard/WizardItem";
import HistoryList from "../Pages/SwapHistory/History";
import { CampaignsComponent } from "../Pages/Campaigns";
import VaulDrawer from "../Modal/vaulModal";

const Comp = () => {

    const { goBack, currentStepName } = useFormWizardState()
    const { goToStep } = useFormWizardaUpdate()

    const [openTopModal, setOpenTopModal] = useState(false);

    const handleModalOpenStateChange = (value: boolean) => {
        setOpenTopModal(value)
        if (value === false) {
            goToStep(MenuStep.Menu)
            // clearMenuPath(router)
        }
    }
    const goBackToMenuStep = () => {
        goToStep(MenuStep.Menu, "back");
        //   clearMenuPath(router) 
    }

    const handleGoToStep = (step: MenuStep, path: string) => {
        goToStep(step)
        // setMenuPath(path, router)
    }

    return <>
        <div className="text-secondary-text cursor-pointer relative">
            <IconButton onClick={() => setOpenTopModal(true)} icon={
                <MenuIcon strokeWidth="2" />
            }>
            </IconButton>
            <VaulDrawer
                show={openTopModal}
                setShow={handleModalOpenStateChange}
                header={
                    <div className="inline-flex items-center">
                        {
                            goBack &&
                            <div className="-ml-2">
                                <IconButton onClick={goBack} icon={
                                    <ChevronLeft strokeWidth="2" />
                                }>
                                </IconButton>
                            </div>
                        }
                        <h2>{currentStepName as string}</h2>
                    </div>
                }
                modalId="menuModal"
            >
                <VaulDrawer.Snap
                    id='item-1'
                    fullheight={true}
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
                </VaulDrawer.Snap>
            </VaulDrawer>
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