import { FC, useCallback, useEffect } from "react";
import ConnectorsList from "@/components/Wallet/WalletModal/ConnectorsList";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { Wallet } from "@/types/wallet";
import { useDepositStep } from "../depositStepContext";
import { useDepositSelection } from "../depositSelectionContext";
import { useSelectSwapAccount } from "@/context/swapAccounts";
import useWallet from "@/hooks/useWallet";
import { isExtendedSourceNetwork } from "@/lib/extendedRoutes/registry";

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
    const { push, back, replace, presetSourceNetwork } = useDepositStep();
    const { setOpen, setPresentation, setSelectedProvider } = useConnectModal();
    const { destination, destinationToken } = useDepositSelection();
    const { providers } = useWallet();
    const selectSourceAccount = useSelectSwapAccount("from");

    useEffect(() => {
        setPresentation("inline");
        // An extended source (e.g. Hyperliquid) can only be funded by the wallet
        // that signs its withdrawal — an EVM wallet. Lock the connector list to
        // that provider so the user can't pick an incompatible chain. The same
        // `withdrawalSupportedNetworks` signal the picker uses to find a
        // compatible wallet identifies the provider here.
        const lockedProvider = presetSourceNetwork && isExtendedSourceNetwork(presetSourceNetwork)
            ? providers.find(p => p.withdrawalSupportedNetworks?.includes(presetSourceNetwork))
            : undefined;
        if (lockedProvider) setSelectedProvider(lockedProvider);
        setOpen(true);
        return () => {
            setSelectedProvider(undefined);
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
        if (!destinationReady) { back(); return; }
        if (presetSourceNetwork) replace("wallet-amount");
        else push("wallet-source");
    }, [destinationReady, push, back, replace, presetSourceNetwork, selectSourceAccount]);

    return (
        <div className="openpicker flex flex-col min-h-0 w-full h-[373px]">
            <ConnectorsList onFinish={handleFinish} />
        </div>
    );
};

export default ConnectStep;
