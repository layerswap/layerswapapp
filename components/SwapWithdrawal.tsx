import { FC, useEffect } from "react";
import { FormWizardProvider } from "../context/formWizardProvider";
import { useQueryState } from "../context/query";
import { useSwapDataState, useSwapDataUpdate } from "../context/swap";
import KnownInternalNames from "../lib/knownIds";
import { SwapStatus } from "../Models/SwapStatus";
import { SwapWithdrawalStep } from "../Models/Wizard";
import { GetSwapStatusStep } from "./utils/SwapStatus";
import SwapWithdrawalWizard from "./Wizard/SwapWithdrawalWizard";

const SwapWithdrawal: FC = () => {
    const { swap } = useSwapDataState()
    const { mutateSwap } = useSwapDataUpdate()
    const query = useQueryState()

    useEffect(() => {
        mutateSwap()
    }, [])

    if (!swap)
        return <div className={`pb-6 bg-secondary-900 shadow-card rounded-lg w-full overflow-hidden relative animate-pulse h-[548px]`}>

        </div>

    let initialStep: SwapWithdrawalStep;
    const sourceIsImmutableX = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase() || swap?.source_network === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()
    const sourceIsStarknet= swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.StarkNetMainnet?.toUpperCase() || swap?.source_network === KnownInternalNames.Networks.StarkNetGoerli?.toUpperCase()
    const userTransferIsPending = swap?.status === SwapStatus.UserTransferPending && !swap.has_sucessfull_published_tx
    const sourceIsSynquote = query?.addressSource === "ea7df14a1597407f9f755f05e25bab42" && (swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.ArbitrumMainnet?.toUpperCase() || swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.ArbitrumGoerli?.toUpperCase())
    
    if (sourceIsImmutableX && userTransferIsPending) {
        const isImtblMarketplace = (query.signature && query.addressSource === "imxMarketplace")
        initialStep = isImtblMarketplace ? SwapWithdrawalStep.ProcessingWalletTransaction : SwapWithdrawalStep.WithdrawFromImtblx
    }
    else if (sourceIsSynquote)
    {
        initialStep = SwapWithdrawalStep.ProcessingWalletTransaction;
    }
    else if(sourceIsStarknet && userTransferIsPending) {
        initialStep = SwapWithdrawalStep.WithdrawFromStarknet
    }
    else {
        initialStep = GetSwapStatusStep(swap);
    }

    const key = Object.keys(query).join("")

    return (
        <FormWizardProvider initialStep={initialStep} initialLoading={true} key={key}>
            <SwapWithdrawalWizard />
        </FormWizardProvider>
    )
};

export default SwapWithdrawal;