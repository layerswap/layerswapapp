import { MenuIcon, ChevronLeft } from "lucide-react";
import { FC, useEffect } from "react";
import IconButton from "../buttons/iconButton";
import { FormWizardProvider, useFormWizardaUpdate, useFormWizardState } from "../../context/formWizardProvider";
import { MenuStep } from "../../Models/Wizard";
import MenuList from "./MenuList";
import Wizard from "../Wizard/Wizard";
import WizardItem from "../Wizard/WizardItem";
import { NextRouter, useRouter } from "next/router";
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import HistoryList from "../SwapHistory/History";
import { Selector, SelectorContent, SelectorTrigger, useSelectorState } from "@/components/Select/Selector/Index";

const ResetHandler = ({ goToStep, router }) => {
    const { isOpen } = useSelectorState()

    useEffect(() => {
        goToStep(MenuStep.Menu)
        clearMenuPath(router)
    }, [isOpen, goToStep, router])

    return null
}

const Comp = () => {
    const router = useRouter();

    const { goBack, currentStepName } = useFormWizardState()
    const { goToStep } = useFormWizardaUpdate()

    const goBackToMenuStep = () => { goToStep(MenuStep.Menu, "back"); clearMenuPath(router) }

    const handleGoToStep = (step: MenuStep, path: string) => {
        goToStep(step)
        setMenuPath(path, router)
    }

    return <>
        <div className="text-secondary-text cursor-pointer relative">
            <Selector>
                <ResetHandler goToStep={goToStep} router={router} />
                <SelectorTrigger disabled={false} className="bg-secondary-500 sm:bg-transparent p-0! rounded-lg hover:bg-secondary-500 hover:text-primary-text transition-colors sm:-mr-2 mr-0">
                    <div className="p-1.5 inline-flex active:animate-press-down">
                        <MenuIcon strokeWidth="2" />
                    </div>
                </SelectorTrigger>
                <SelectorContent
                    isLoading={false}
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
                                    <HistoryList onNewTransferClick={closeModal} />
                                </WizardItem>
                            </Wizard>
                        </div>
                    )}
                </SelectorContent>
            </Selector>
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