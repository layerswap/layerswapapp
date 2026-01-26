import { MenuIcon, ChevronLeft } from "lucide-react";
import { FC, useEffect, useState } from "react";
import IconButton from "../buttons/iconButton";
import { FormWizardProvider, useFormWizardaUpdate, useFormWizardState } from "../../context/formWizardProvider";
import { MenuStep } from "../../Models/Wizard";
import MenuList from "./MenuList";
import Wizard from "../Wizard/Wizard";
import WizardItem from "../Wizard/WizardItem";
import { NextRouter, useRouter } from "next/router";
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import HistoryList from "../SwapHistory/History";
import { Modal, ModalContent } from "@/components/modal/modalWithoutAnimation";

const Comp = () => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false)

    const { goBack, currentStepName } = useFormWizardState()
    const { goToStep } = useFormWizardaUpdate()

    const goBackToMenuStep = () => { goToStep(MenuStep.Menu, "back"); clearMenuPath(router) }

    const handleGoToStep = (step: MenuStep, path: string) => {
        goToStep(step)
        setMenuPath(path, router)
    }

    useEffect(() => {
        if (isOpen) {
            goToStep(MenuStep.Menu)
            clearMenuPath(router)
        }
    }, [isOpen, goToStep, router])

    return <>
        <div className="text-secondary-text cursor-pointer relative">
            <div className="sm:-mr-2 mr-0">
                <IconButton className="inline-flex active:animate-press-down" onClick={() => setIsOpen(true)} icon={
                    <MenuIcon strokeWidth="2" />
                } />
            </div>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
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
                                    <HistoryList onNewTransferClick={() => { closeModal(); clearMenuPath(router) }} />
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

//TODO: move URI handling to wizard provider
export const setMenuPath = (path: string, router: NextRouter) => {
    const basePath = router?.basePath || ""
    var finalURI = window.location.protocol + "//"
        + window.location.host + `${basePath}${path}`;
    const params = resolvePersistantQueryParams(router.query)
    if (params && Object.keys(params).length) {
        const search = new URLSearchParams(params as any);
        if (search)
            finalURI += `?${search}`
    }
    window.history.pushState({ ...window.history.state, as: router.asPath, url: finalURI }, '', finalURI);
}

export const clearMenuPath = (router: NextRouter) => {
    const basePath = router?.basePath || ""
    let finalURI = window.location.protocol + "//"
        + window.location.host + basePath + router.asPath;

    window.history.replaceState({ ...window.history.state, as: router.asPath, url: finalURI }, '', finalURI);
}

export default LayerswapMenu