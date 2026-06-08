"use client";
import { FC, useState } from "react";
import clsx from "clsx";
import { Partner } from "@/Models/Partner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/shadcn/dialog";
import { DepositStep, DepositStepProvider, useDepositStep } from "./depositStepContext";
import { DepositSelectionProvider } from "./depositSelectionContext";
import DepositHeader from "./DepositHeader";
import MethodPicker from "./Options/MethodPicker";
import WalletFlow from "./Wallet";
import WaitingForConnect from "./Wallet/WaitingForConnect";
import TransferCrypto from "./TransferCrypto";
import { SupportedDestination } from "./DestinationTokenPicker";
import { Widget } from "@/components/Widget/Index";
import ResizablePanel from "@/components/Common/ResizablePanel";
import { DepositSettingsProvider } from "@/context/depositSettings";
import ThemeWrapper from "@/components/themeWrapper";
import useAllWithdrawalBalances from "@/hooks/useAllWithdrawalBalances";
import { useConnectModal } from "@/exports/internal";

export type DepositMode = "inline" | "button";

export type DepositProps = {
    partner?: Partner;
    /** Allowed destination network/token pairs. The user picks from this list
     * via the token dropdown; the network is determined by the chosen token. */
    destinations: SupportedDestination[];
    /** Recipient address on the destination network. Required — the deposit
     * widget never asks the end user for this. */
    destinationAddress: string;
    /** "inline" (default) renders the widget directly. "button" renders a Deposit
     * button that opens the widget inside a dialog. */
    mode?: DepositMode;
    /** Title shown in the widget header. Defaults to "Deposit". */
    title?: string;
    /** Label for the trigger button when mode="button". Defaults to "Deposit". */
    buttonLabel?: string;
    /** Extra className applied to the trigger button when mode="button". */
    buttonClassName?: string;
    /** When true, hide the "Send to" recipient row in the quote summary. The
     * deposit widget's recipient is the integrator's own locked address, so
     * the row is often redundant for the end user. Defaults to false. */
    hideRecipient?: boolean;
    actionButtonText?: string;
    /** Default amount (in USD) seeded into the wallet flow once the user
     * picks a source token. Defaults to $1. Set to 0 to disable seeding. */
    defaultAmountUsd?: number;
};

const StepRouter: FC<{ step: DepositStep; partner?: Partner }> = ({
    step,
    partner,
}) => {
    switch (step) {
        case "method-picker": return <MethodPicker />;
        case "wallet-connecting": return <WaitingForConnect />;
        case "transfer-crypto": return <TransferCrypto partner={partner} />;
        case "wallet-source":
        case "wallet-amount":
        case "wallet-processing": return <WalletFlow partner={partner} />;
        default: {
            void (step satisfies never);
            return null;
        }
    }
};

const DepositForm: FC<Pick<DepositProps, "partner" | "title"> & { onClose?: () => void }> = ({ partner, title, onClose }) => {
    const { step } = useDepositStep();
    useAllWithdrawalBalances();

    return (
        <div className="flex flex-col gap-3 w-full pt-4 max-sm:pb-4">
            <DepositHeader title={title} onClose={onClose} />
            <div className="h-px w-full bg-secondary-400" />
            <ResizablePanel>
                <StepRouter step={step} partner={partner} />
            </ResizablePanel>
        </div>
    );
};

const DepositCard: FC<Pick<DepositProps, "partner" | "destinations" | "destinationAddress" | "hideRecipient" | "title" | "actionButtonText" | "defaultAmountUsd"> & { onClose?: () => void }> = ({ partner, destinations, destinationAddress, hideRecipient, title, actionButtonText, defaultAmountUsd, onClose }) => {
    return (
        <DepositSettingsProvider value={{
            hideRecipient: !!hideRecipient,
            actionButtonText,
            defaultAmountUsd,
        }}>
            <ThemeWrapper>
                <Widget hideMenu fitHeight>
                    <DepositSelectionProvider destinations={destinations} destinationAddress={destinationAddress}>
                        <DepositStepProvider>
                            <DepositForm partner={partner} title={title} onClose={onClose} />
                        </DepositStepProvider>
                    </DepositSelectionProvider>
                </Widget>
            </ThemeWrapper>
        </DepositSettingsProvider>
    );
};

export const Deposit: FC<DepositProps> = ({ mode = "inline", buttonLabel = "Deposit", buttonClassName, ...props }) => {
    const [open, setOpen] = useState(false);
    const { cancel } = useConnectModal();

    if (mode === "button") {
        return (
            <Dialog open={open} onOpenChange={(state) => { setOpen(state); if (!state) cancel() }}>
                <DialogTrigger asChild>
                    <button
                        type="button"
                        className={clsx(
                            "navigation-focus-ring-text-bold-lg enabled:active:animate-press-down bg-primary-500 text-primary-buttonTextColor font-medium rounded-full px-6 py-2 hover:brightness-110 transition duration-200 ease-in-out focus:outline-none",
                            buttonClassName,
                        )}
                    >
                        {buttonLabel}
                    </button>
                </DialogTrigger>
                <DialogContent showCloseButton={false} className="!p-0 !bg-transparent !ring-0 !gap-0 sm:!max-w-md *:min-w-0">
                    <DepositCard {...props} onClose={() => setOpen(false)} />
                </DialogContent>
            </Dialog>
        );
    }
    return <DepositCard {...props} />;
};

export default Deposit;
