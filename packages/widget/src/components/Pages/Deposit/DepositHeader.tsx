import { FC } from "react";
import { ChevronLeft } from "lucide-react";
import { useFormikContext } from "formik";
import { DepositStep, useDepositStep } from "./depositStepContext";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import IconButton from "@/components/Buttons/iconButton";

// The destination chain hint is shown alongside the token on every step that
// has a known destination — it's the "Deposit USDC · Base" pattern from the
// design and keeps users oriented as they move between screens.
const showsChainHint: Record<DepositStep, boolean> = {
    "method-picker": true,
    "wallet-amount": true,
    "wallet-processing": false,
    "transfer-crypto": true,
};

const DepositHeader: FC = () => {
    const { step, back, canGoBack } = useDepositStep();
    const { values } = useFormikContext<SwapFormValues>();

    const title = `Deposit ${values.toAsset?.symbol}`
    const chainHint = showsChainHint[step] && values.to?.display_name
        ? values.to.display_name
        : null;

    return (
        <div className="flex items-center gap-1 min-w-0 w-full">
            {canGoBack && (
                <IconButton
                    onClick={back}
                    icon={<ChevronLeft className="h-5 w-5" />}
                    aria-label="Back"
                />
            )}
            <h2 className="text-primary-text text-2xl font-semibold truncate">
                {title}
                {chainHint && (
                    <span className="text-secondary-text font-normal">{" · "}{chainHint}</span>
                )}
            </h2>
        </div>
    );
};

export default DepositHeader;
