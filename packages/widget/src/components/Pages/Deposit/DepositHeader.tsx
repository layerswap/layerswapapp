import { FC } from "react";
import { ChevronLeft, X } from "lucide-react";
import { useDepositStep } from "./depositStepContext";
import IconButton from "@/components/Buttons/iconButton";

const DepositHeader: FC<{ title?: string; onClose?: () => void; onBack?: () => void }> = ({ title = "Deposit", onClose, onBack }) => {
    const { back, canGoBack } = useDepositStep();

    return (
        <div className="flex items-center justify-between w-full h-[32px]">
            <div className="flex items-center gap-1">
                {canGoBack && (
                    <IconButton
                        onClick={onBack ?? back}
                        icon={<ChevronLeft className="h-5 w-5" />}
                        aria-label="Back"
                    />
                )}
                <h2 className="text-primary-text text-lg font-semibold truncate">
                    {title}
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
