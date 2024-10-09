import { FC } from "react"
import WizardItem from "../../Wizard/WizardItem"
import { HistorySwapProvider, useHistoryContext } from "../../../context/historyContext"
import SwapDetails from "../../SwapHistory/SwapDetailsComponent"
import HistoryList from "../../SwapHistory/HistoryComponent/History"
import { useFormWizardaUpdate } from "../../../context/formWizardProvider"
import { MenuStep } from "../../../Models/Wizard"

const HistoryWizard: FC = () => {

    const { goToStep } = useFormWizardaUpdate()
    const goBackToMenuStep = () => goToStep(MenuStep.Menu, "back")
    const goBackToHistoryListStep = () => goToStep(MenuStep.Transactions, "back")

    return (
        <HistorySwapProvider>
            <WizardItem StepName={MenuStep.Transactions} GoBack={goBackToMenuStep} className="h-full">
                <HistoryList onSwapSettled={() => goToStep(MenuStep.TransactionDetails)} componentType="steps" refreshing={false} loadExplorerSwaps={true} />
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