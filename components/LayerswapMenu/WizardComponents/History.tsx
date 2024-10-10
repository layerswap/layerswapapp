import { FC, useEffect } from "react"
import WizardItem from "../../Wizard/WizardItem"
import { HistorySwapProvider, useHistoryContext } from "../../../context/historyContext"
import SwapDetails from "../../SwapHistory/SwapDetailsComponent"
import HistoryList from "../../SwapHistory/HistoryComponent/History"
import { useFormWizardaUpdate } from "../../../context/formWizardProvider"
import { MenuStep } from "../../../Models/Wizard"
import { useRouter } from "next/router"
import { clearMenuPath } from ".."

const HistoryWizard: FC<{ setModalOpenState: (value: boolean) => void }> = ({ setModalOpenState }) => {
    const router = useRouter();

    const { goToStep } = useFormWizardaUpdate()

    const goBackToMenuStep = () => { goToStep(MenuStep.Menu, "back"); clearMenuPath(router) }
    const goBackToHistoryListStep = () => { goToStep(MenuStep.Transactions, "back"); }

    const onNewTransferClick = () => {
        setModalOpenState(false)
        goToStep(MenuStep.Menu)
    }

    return (
        <HistorySwapProvider>
            <WizardItem StepName={MenuStep.Transactions} GoBack={goBackToMenuStep} className="h-full">
                <HistoryList onSwapSettled={() => goToStep(MenuStep.TransactionDetails)} onNewTransferClick={onNewTransferClick} componentType="steps" loadExplorerSwaps={true} />
            </WizardItem>
            <WizardItem StepName={MenuStep.TransactionDetails} GoBack={goBackToHistoryListStep} >
                <DetailsWrapper />
            </WizardItem>
        </HistorySwapProvider>
    )
}

const DetailsWrapper = () => {
    const { selectedSwap } = useHistoryContext()

    if (!selectedSwap) return <></>

    return <SwapDetails swapResponse={selectedSwap} />

}


export default HistoryWizard