import { FC } from "react";
import { ChevronLeft, X } from "lucide-react";
import { useDepositStep } from "./depositStepContext";
import IconButton from "@/components/Buttons/iconButton";

const DepositHeader: FC<{ title?: string; onClose?: () => void }> = ({ title = "Deposit", onClose }) => {
    const { back, canGoBack, closeLocked } = useDepositStep();

    // Hide the close button while a transfer is mid-flight so the user can't
    // dismiss the modal. Each flow reports its own lock condition (see
    // useReportCloseLock); it clears once the swap is terminal.
    const showClose = !!onClose && !closeLocked;

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
                </h2>
            </div>
            {showClose && (
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
