"use client";
import { FC, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Partner } from "@/Models/Partner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/shadcn/dialog";
import { FamilyDrawer, ViewsRegistry } from "@/components/Modal/FamilyDrawer";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import useWindowDimensions from "@/hooks/useWindowDimensions";
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
import { DepositLoading, LayerswapProvider } from "@/index";
import { LayerswapContextProps } from "@/context/LayerswapProvider";

export type DepositMode = "inline" | "button";

export type DepositProps = {
    partner?: Partner;
    /** The single destination network and its allowed tokens. The network is
     * fixed; the user picks one of the tokens via the token dropdown. */
    destination: SupportedDestination;
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
    /** When true, show the "Send to" destination address row in the quote
     * summary. The deposit widget's recipient is the integrator's own locked
     * address, so the row is often redundant for the end user. Defaults to false. */
    showDestinationAddress?: boolean;
    actionButtonText?: string;
    /** Default amount (in USD) seeded into the wallet flow once the user
     * picks a source token. Defaults to $1. Set to 0 to disable seeding. */
    defaultAmountUsd?: number;
};

const StepRouter: FC<{ step: DepositStep; partner?: Partner; hasWalletMethods: boolean }> = ({
    step,
    partner,
    hasWalletMethods,
}) => {
    switch (step) {
        case "method-picker": return <MethodPicker />;
        case "transfer-crypto": return <TransferCrypto partner={partner} showDestinationPicker={!hasWalletMethods} />;
        case "wallet-ecosystem":
        case "wallet-connect":
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
    const { step, back, hasWalletMethods } = useDepositStep();
    const { selectedConnector, selectedMultiChainConnector, goBack } = useConnectModal();

    // On the inline connect step the single deposit header doubles as the
    // connect header: its back navigates within the connect sub-views first
    // (goBack), and only pops the step once at the connector grid. The title
    // mirrors the modal's ("Select ecosystem" while choosing a multichain
    // ecosystem, otherwise "Connect wallet").
    const inConnectSubView = !!(selectedConnector || selectedMultiChainConnector);
    const headerTitle = step === "wallet-connect"
        ? (selectedMultiChainConnector && !selectedConnector ? "Select ecosystem" : "Connect wallet")
        : title;
    const headerBack = step === "wallet-connect" && inConnectSubView ? goBack : back;
    useAllWithdrawalBalances();

    return (
        <div className="flex flex-col gap-3 w-full pt-4 max-sm:pb-4">
            <DepositHeader title={headerTitle} onClose={onClose} onBack={headerBack} />
            <div className="h-px w-full bg-secondary-400" />
            <ResizablePanel>
                <StepRouter step={step} partner={partner} hasWalletMethods={hasWalletMethods} />
            </ResizablePanel>
        </div>
    );
};

const DepositCard: FC<Pick<DepositProps, "partner" | "destination" | "destinationAddress" | "showDestinationAddress" | "title" | "actionButtonText" | "defaultAmountUsd"> & { onClose?: () => void }> = ({ partner, destination, destinationAddress, showDestinationAddress, title, actionButtonText, defaultAmountUsd, onClose }) => {
    return (
        <DepositSettingsProvider value={{
            showDestinationAddress,
            actionButtonText,
            defaultAmountUsd,
        }}>
            <ThemeWrapper>
                <Widget hideMenu fitHeight>
                    <DepositSelectionProvider destination={destination} destinationAddress={destinationAddress}>
                        <DepositStepProvider>
                            <DepositForm partner={partner} title={title} onClose={onClose} />
                        </DepositStepProvider>
                    </DepositSelectionProvider>
                </Widget>
            </ThemeWrapper>
        </DepositSettingsProvider>
    );
};

export const DepositComponent: FC<DepositProps> = ({ mode = "inline", buttonLabel = "Deposit", buttonClassName, ...props }) => {
    const [open, setOpen] = useState(false);
    const { isMobile } = useWindowDimensions();

    // Keep the latest props reachable from the (stable) drawer view. Recreating
    // the view component on every render would remount the whole deposit flow
    // and lose its state, so the view is memoized once and reads through a ref.
    const propsRef = useRef(props);
    propsRef.current = props;
    const drawerViews = useMemo<ViewsRegistry>(
        () => ({
            default: function DepositDrawerView() {
                return <DepositCard {...propsRef.current} onClose={() => setOpen(false)} />;
            },
        }),
        [],
    );

    if (mode === "button") {
        const triggerButton = (
            <button
                type="button"
                className={clsx(
                    "navigation-focus-ring-text-bold-lg enabled:active:animate-press-down bg-primary-500 text-primary-buttonTextColor font-medium rounded-full px-6 py-2 hover:brightness-110 transition duration-200 ease-in-out focus:outline-none",
                    buttonClassName,
                )}
            >
                {buttonLabel}
            </button>
        );

        // Mobile: present the deposit flow as a draggable bottom sheet. The
        // Widget supplies its own surface, so the drawer renders in `bare` mode.
        if (isMobile) {
            return (
                <FamilyDrawer
                    bare
                    open={open}
                    onOpenChange={setOpen}
                    trigger={triggerButton}
                    views={drawerViews}
                />
            );
        }

        // Desktop: keep the centered dialog.
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>{triggerButton}</DialogTrigger>
                <DialogContent showCloseButton={false} className="!p-0 !bg-transparent !ring-0 !gap-0 sm:!max-w-md *:min-w-0">
                    <DepositCard {...props} onClose={() => setOpen(false)} />
                </DialogContent>
            </Dialog>
        );
    }
    return <DepositCard {...props} />;
};

export const Deposit: FC<LayerswapContextProps & DepositProps> = ({ callbacks, config, walletProviders, children, ...depositProps }) => {
    const resolvedConfig: LayerswapContextProps['config'] = {
        ...config,
        loadingComponent: <DepositLoading />
    }
    return (
        <LayerswapProvider callbacks={callbacks} config={resolvedConfig} walletProviders={walletProviders}>
            <DepositComponent {...depositProps} />
        </LayerswapProvider>
    );
}

export default Deposit;
