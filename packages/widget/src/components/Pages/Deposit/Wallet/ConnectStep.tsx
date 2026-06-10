import { FC, useCallback, useEffect } from "react";
import ConnectorsList from "@/components/Wallet/WalletModal/ConnectorsList";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { Wallet } from "@/types/wallet";
import { useDepositStep } from "../depositStepContext";
import { useDepositSelection } from "../depositSelectionContext";
import { useSelectSwapAccount } from "@/context/swapAccounts";

/**
 * Inline presentation of the wallet-connect UI, rendered as a deposit step so
 * it lives inside the deposit widget (and the FamilyDrawer/dialog) instead of
 * the global VaulDrawer — which would otherwise stack behind the deposit sheet.
 *
 * It drives the shared connect machine declaratively: on mount it selects the
 * target provider, flips the presentation to `inline` (suppressing the global
 * modal, see walletProviders.tsx) and opens the machine; on unmount it closes
 * it, which resets the machine's selection state. This is idempotent and
 * therefore safe under React StrictMode's double-invoke, unlike an
 * await-the-promise approach whose cleanup would resolve the connect early.
 *
 * The connect header (back + title) is provided by the single DepositHeader,
 * which becomes connect-aware on this step (see DepositForm).
 */
const ConnectStep: FC = () => {
    const { push, back } = useDepositStep();
    const { setOpen, setPresentation } = useConnectModal();
    const { destination, destinationToken } = useDepositSelection();
    const selectSourceAccount = useSelectSwapAccount("from");

    useEffect(() => {
        setPresentation("inline");
        setOpen(true);
        return () => {
            setPresentation("modal");
            setOpen(false);
        };
        // Run once for the lifetime of the step; setters are stable.
    }, []);

    const destinationReady = !!destination && !!destinationToken;

    const handleFinish = useCallback((wallet?: Wallet) => {
        if (!wallet) return;
        // The wallet flow lands on AmountStep, which needs a destination to
        // quote. If one isn't picked yet (the "Wallet transfer" card can be
        // used while disconnected), drop back to the method picker instead.
        selectSourceAccount(wallet);
        if (destinationReady) push("wallet-source");
        else back();
    }, [destinationReady, push, back]);

    return (
        <div className="openpicker flex flex-col min-h-0 w-full h-[373px]">
            <ConnectorsList onFinish={handleFinish} />
        </div>
    );
};

export default ConnectStep;
