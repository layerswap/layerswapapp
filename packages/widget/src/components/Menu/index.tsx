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
import { CampaignDetailsComponent } from "../Pages/Campaigns/Details";
import VaulDrawer from "../Modal/vaulModal";

const Comp = () => {

    const { goBack, currentStepName } = useFormWizardState()
    const { goToStep } = useFormWizardaUpdate()

    const [openTopModal, setOpenTopModal] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<undefined | string>(undefined)

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
            <div className="sm:-mr-2 mr-0">
                <IconButton className="inline-flex active:animate-press-down" onClick={() => setOpenTopModal(true)} icon={
                    <MenuIcon strokeWidth="2" />
                } />
            </div>
            <VaulDrawer
                modalId="menuModal"
                show={openTopModal}
                setShow={handleModalOpenStateChange}
                header={
                    <div className="inline-flex items-center">
                        {
                            goBack &&
                            <IconButton className="inline-flex" onClick={goBack} icon={
                                <ChevronLeft strokeWidth="2" />
                            }>
                            </IconButton>
                        }
                        <h2>{currentStepName as string}</h2>
                    </div>
                }
            >
                <VaulDrawer.Snap openFullHeight className="h-full pb-0!" id="item-1">
                    <Wizard wizardId='menuWizard' >
                        <WizardItem StepName={MenuStep.Menu} inModal>
                            <MenuList goToStep={handleGoToStep} />
                        </WizardItem>
                        <WizardItem StepName={MenuStep.Transactions} GoBack={goBackToMenuStep} className="h-full" inModal>
                            <HistoryList onNewTransferClick={() => handleModalOpenStateChange(false)} />
                        </WizardItem>
                        <WizardItem StepName={MenuStep.Campaigns} GoBack={goBackToMenuStep} className="h-full" inModal>
                            <CampaignsComponent onCampaignSelect={(campaign) => { handleGoToStep(MenuStep.CampaignDetails); setSelectedCampaign(campaign.name) }} />
                        </WizardItem>
                        <WizardItem StepName={MenuStep.CampaignDetails} GoBack={() => goToStep(MenuStep.Campaigns, "back")} className="h-full" inModal>
                            <CampaignDetailsComponent campaignName={selectedCampaign} />
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