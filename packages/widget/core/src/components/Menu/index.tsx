import { MenuIcon, ChevronLeft } from "lucide-react";
import { FC, Suspense, lazy, useEffect, useState } from "react";
import IconButton from "../Buttons/iconButton";
import { FormWizardProvider, useFormWizardaUpdate, useFormWizardState } from "../../context/formWizardProvider";
import { MenuStep } from "../../Models/Wizard";
import MenuList from "./MenuList";
import Wizard from "../Wizard/Wizard";
import WizardItem from "../Wizard/WizardItem";
import { Modal, ModalContent } from "../Modal/modalWithoutAnimation";
import { useCallbacks } from "../../context/callbackProvider";
import { useControllableState } from "../Modal/vaul/use-controllable-state";
import AddressBookStep from "../AddressBook/AddressBookStep";

// History and Campaigns are only rendered after the user opens this menu
// and navigates to a sub-step. Lazy-loading keeps their components — plus
// the per-row UI they pull in transitively — out of every page's entry
// chunks (they leaked onto `/` because the menu is always mounted in the
// header). Wizard renders only the active StepName, so the suspense
// fallback never shows while the user is on the Menu step.
const HistoryList = lazy(() => import("../Pages/SwapHistory/History"))
const CampaignsComponent = lazy(() =>
    import("../Pages/Campaigns").then(m => ({ default: m.CampaignsComponent }))
)
const CampaignDetailsComponent = lazy(() =>
    import("../Pages/Campaigns/Details").then(m => ({ default: m.CampaignDetailsComponent }))
)

const Comp = () => {

    const { goBack, currentStepName } = useFormWizardState()
    const { goToStep } = useFormWizardaUpdate()
    const { onMenuNavigationChange } = useCallbacks()

    const [isOpen = false, setIsOpen] = useControllableState<boolean>({
        onChange: () => {
            goToStep(MenuStep.Menu)
            onMenuNavigationChange('/')
        },
    });
    const [selectedCampaign, setSelectedCampaign] = useState<undefined | string>(undefined)

    const handleModalOpenStateChange = (value: boolean) => {
        setIsOpen(value)
        if (value === false) {
            goToStep(MenuStep.Menu)
            onMenuNavigationChange("/")
        }
    }
    const goBackToMenuStep = () => {
        goToStep(MenuStep.Menu, "back")
        onMenuNavigationChange("/")
    }

    const handleGoToStep = (step: MenuStep, path?: string) => {
        goToStep(step)
        if (path) {
            onMenuNavigationChange(path)
        }
    }

    return <>
        <div className="text-secondary-text cursor-pointer relative">
            <div className="sm:-mr-2 mr-0">
                <IconButton className="inline-flex active:animate-press-down" onClick={() => setIsOpen(true)} icon={
                    <MenuIcon strokeWidth="2" />
                } />
            </div>
            <Modal isOpen={isOpen} setIsOpen={handleModalOpenStateChange}>
                <ModalContent
                    className="pb-4"
                    header={
                        <div className="inline-flex items-center w-full">
                            {
                                goBack &&
                                <div className="-ml-2">
                                    <IconButton className="inline-flex" onClick={goBack} icon={
                                        <ChevronLeft strokeWidth="2" />
                                    }>
                                    </IconButton>
                                </div>
                            }
                            <h2 className="flex-1">{currentStepName as string}</h2>
                        </div>
                    }
                >
                    {({ closeModal }) => (
                        <div className="openpicker h-full" id="virtualListContainer">
                            <Wizard wizardId='menuWizard' >
                                <WizardItem StepName={MenuStep.Menu} inModal>
                                    <MenuList goToStep={handleGoToStep} />
                                </WizardItem>
                                <WizardItem StepName={MenuStep.Transactions} GoBack={goBackToMenuStep} className="h-full" inModal>
                                    <Suspense fallback={null}>
                                        <HistoryList onNewTransferClick={() => { closeModal(); onMenuNavigationChange("/") }} />
                                    </Suspense>
                                </WizardItem>
                                <WizardItem StepName={MenuStep.Campaigns} GoBack={goBackToMenuStep} className="h-full" inModal>
                                    <Suspense fallback={null}>
                                        <CampaignsComponent onCampaignSelect={(campaign) => { handleGoToStep(MenuStep.CampaignDetails); setSelectedCampaign(campaign.name) }} />
                                    </Suspense>
                                </WizardItem>
                                <WizardItem StepName={MenuStep.CampaignDetails} GoBack={() => { goToStep(MenuStep.Campaigns, "back"); onMenuNavigationChange("/campaigns") }} className="h-full" inModal>
                                    <Suspense fallback={null}>
                                        <CampaignDetailsComponent campaignName={selectedCampaign} />
                                    </Suspense>
                                </WizardItem>
                                <WizardItem StepName={MenuStep.AddressBook} GoBack={goBackToMenuStep} inModal>
                                    <AddressBookStep onBack={goBackToMenuStep} />
                                </WizardItem>
                            </Wizard>
                        </div>
                    )}
                </ModalContent>
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