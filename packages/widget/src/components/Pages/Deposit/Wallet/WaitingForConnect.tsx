import { FC, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { useDepositStep } from "../depositStepContext";
import { useSelectedAccount, useSelectSwapAccount } from "@/exports/internal";

/**
 * Interstitial shown while the wallet connect modal is open. The connect modal
 * portals on top of this step, so all this renders is a spinner placeholder
 * behind it. On mount it opens the connect modal; once the user picks a wallet
 * it hands off to wallet-source (replacing itself so `back` returns to the
 * method picker), and if they dismiss the modal it pops back. The connected
 * wallet surfaces in the swapAccounts store, so nothing needs to be threaded
 * through here.
 */
const WaitingForConnect: FC = () => {
    const { connect } = useConnectModal();
    const { replace, back } = useDepositStep();
    const selectSourceAccount = useSelectSwapAccount("from");
    // Guard against the effect firing twice (StrictMode) and re-opening the modal.
    const started = useRef(false);

    useEffect(() => {
        // Open the connect modal exactly once. The ref guard survives React
        // StrictMode's mount→unmount→remount, so the second invocation bails
        // here instead of opening a second modal. We deliberately don't cancel
        // on cleanup: the in-flight connect promise must still resolve and
        // navigate, and replace/back target the step provider above us (which
        // stays mounted), so they're safe to call after this unmounts.
        if (started.current) return;
        started.current = true;

        (async () => {
            const connectedWallet = await connect(undefined, { dismissible: true });
            if (!connectedWallet) {
                back();
                return;
            }
            selectSourceAccount(connectedWallet)
            replace("wallet-source");
        })();
    }, [connect, replace, back]);

    return (
        <div className="flex flex-col items-center justify-center gap-3 min-h-[373px] w-full">
            <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
            <p className="text-secondary-text text-sm">Connecting your wallet…</p>
        </div>
    );
};

export default WaitingForConnect;
