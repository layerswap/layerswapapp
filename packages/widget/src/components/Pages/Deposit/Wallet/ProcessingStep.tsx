import { FC } from "react";
import SwapDetails from "@/components/Pages/Swap/Withdraw/SwapDetails";
import { Partner } from "@/Models/Partner";
import { useDepositStep } from "../depositStepContext";

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

    return (
        <div className="w-full h-full flex-1 min-h-0 flex flex-col">
            <SwapDetails
                type="contained"
                partner={partner}
                onCancelWithdrawal={back}
            />
        </div>
    );
};

export default ProcessingStep;
