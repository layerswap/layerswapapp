import { FC } from "react";
import { ChevronLeft } from "lucide-react";
import { useFormikContext } from "formik";
import DestinationSelector from "./DestinationSelector";
import { DepositStep, useDepositStep } from "./depositStepContext";
import { useInitialSettings } from "@/context/settings";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import IconButton from "@/components/Buttons/iconButton";

const stepTitles: Record<DepositStep, (token?: string) => string> = {
    "method-picker": (token) => token ? `Deposit ${token}` : "Deposit",
    "wallet-amount": (token) => token ? `Deposit ${token}` : "Deposit",
    "wallet-processing": () => "Processing",
    "transfer-crypto": () => "Transfer Crypto",
};

const DepositHeader: FC = () => {
    const { step, back, canGoBack } = useDepositStep();
    const { values } = useFormikContext<SwapFormValues>();
    const initialSettings = useInitialSettings();
    const isLocked = !!initialSettings.lockTo && !!initialSettings.lockToAsset;

    const title = stepTitles[step](values.toAsset?.symbol);

    // On the method-picker step, show the destination selector inline. On
    // sub-steps the selector is moved to the body or hidden — the header just
    // shows the breadcrumb title with a back arrow.
    const showSelectorInHeader = step === "method-picker";

    return (
        <div className="flex items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-1 min-w-0">
                {canGoBack && (
                    <IconButton
                        onClick={back}
                        icon={<ChevronLeft className="h-5 w-5" />}
                        aria-label="Back"
                    />
                )}

                <h2 className="text-primary-text text-2xl font-semibold truncate">{title}</h2>
            </div>
            {showSelectorInHeader && (
                <div className="shrink-0 min-w-0 max-w-[60%]">
                    <DestinationSelector locked={isLocked} />
                </div>
            )}
        </div>
    );
};

export default DepositHeader;
