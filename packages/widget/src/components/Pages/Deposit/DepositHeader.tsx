import { FC } from "react";
import { ChevronLeft, X } from "lucide-react";
import { useFormikContext } from "formik";
import { useDepositStep } from "./depositStepContext";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import IconButton from "@/components/Buttons/iconButton";

const DepositHeader: FC<{ onClose?: () => void }> = ({ onClose }) => {
    const { back, canGoBack } = useDepositStep();
    const { values } = useFormikContext<SwapFormValues>();

    const title = `Deposit ${values.toAsset?.symbol}`
    const chainHint = values.to?.display_name
        ? values.to.display_name
        : null;

    return (
        <div className="flex items-center justify-between w-full h-[32px]">
            <div className="flex items-center gap-1">
                {canGoBack && (
                    <IconButton
                        onClick={back}
                        icon={<ChevronLeft className="h-5 w-5" />}
                        aria-label="Back"
                    />
                )}
                <h2 className="text-primary-text text-lg font-semibold truncate">
                    {title}
                    {chainHint && (
                        <span className="text-secondary-text font-normal">{" · "}{chainHint}</span>
                    )}
                </h2>
            </div>
            {onClose && (
                <IconButton
                    onClick={onClose}
                    icon={<X className="h-5 w-5" />}
                    aria-label="Close"
                />
            )}
        </div>
    );
};

export default DepositHeader;
