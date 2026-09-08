import { FC, Suspense, lazy } from "react";
import { SwapDetailsSceleton } from "@/components/Common/Sceletons";
import { Partner } from "@/Models/Partner";
import { useDepositStep, useReportCloseLock } from "../depositStepContext";
import { useResolvedSwapStatus } from "@/hooks/useResolvedSwapStatus";

// SwapDetails transitively imports the whole Swap-processing subtree; loading
// it lazily (as FormWrapper already does) keeps it out of the Deposit exposes'
// sync bundle, which is nearly at the CDN bundle-budget gate.
const SwapDetails = lazy(() => import("@/components/Pages/Swap/Withdraw/SwapDetails"));

type Props = {
    partner?: Partner;
};

/**
 * Renders the existing wallet-withdraw + processing-timeline pipeline inline
 * (rather than inside the Vaul modal used by the Swap form's FormWrapper).
 * SwapDetails reads its data from the SwapDataProvider populated by the
 * Review step's `setSubmitedFormValues` call.
 */
const ProcessingStep: FC<Props> = ({ partner }) => {
    // Step back to wallet-amount on cancel so the user can adjust the amount
    // and retry without re-picking the method.
    const { back } = useDepositStep();

    // Keep the header's close button hidden until the swap reaches a terminal
    // status, so users can't dismiss the modal mid-transfer.
    const { isTerminal } = useResolvedSwapStatus();
    useReportCloseLock(!isTerminal);

    return (
        <div className="w-full h-full flex-1 min-h-0 flex flex-col">
            <Suspense fallback={<SwapDetailsSceleton />}>
                <SwapDetails
                    type="contained"
                    partner={partner}
                    onCancelWithdrawal={back}
                />
            </Suspense>
        </div>
    );
};

export default ProcessingStep;
