import { FC } from "react";
import { ChevronLeft } from "lucide-react";
import { useFormikContext } from "formik";
import DestinationTokenPicker, { SupportedDestination, useResolvedDestinations } from "./DestinationTokenPicker";
import { DepositStep, useDepositStep } from "./depositStepContext";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import IconButton from "@/components/Buttons/iconButton";

const stepTitles: Record<DepositStep, (token?: string) => string> = {
    "method-picker": (token) => token ? `Deposit ${token}` : "Deposit",
    "wallet-amount": (token) => token ? `Deposit ${token}` : "Deposit",
    "wallet-processing": () => "Processing",
    "transfer-crypto": () => "Transfer Crypto",
};

type Props = {
    destinations: SupportedDestination[];
};

const DepositHeader: FC<Props> = ({ destinations }) => {
    const { step, back, canGoBack } = useDepositStep();
    const { values } = useFormikContext<SwapFormValues>();
    const resolved = useResolvedDestinations(destinations);

    const title = stepTitles[step](values.toAsset?.symbol);

    // On the method-picker step, show the destination token picker — but only
    // when the integrator supplied more than one option. With a single option
    // there's nothing to choose, so the picker is dead UI. On sub-steps the
    // selector is moved to the body or hidden — the header just shows the
    // breadcrumb title with a back arrow.
    const showSelectorInHeader = step === "method-picker" && resolved.length > 1;

    return (
        <div className="flex flex-col gap-3 w-full border-b border-secondary-500 pb-3">
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
                <div className="w-full min-w-0">
                    <DestinationTokenPicker destinations={destinations} />
                </div>
            )}
        </div>
    );
};

export default DepositHeader;
