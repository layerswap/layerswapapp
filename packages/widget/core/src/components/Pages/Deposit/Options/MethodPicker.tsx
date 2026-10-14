import { FC } from "react";
import { QrCode } from "lucide-react";
import useWallet from "@/hooks/useWallet";
import { useSelectSwapAccount } from "@/context/swapAccounts";
import { useDepositSettings } from "@/context/depositSettings";
import { useDepositStep } from "../depositStepContext";
import { DepositMethodId } from "../depositMethods";
import { useDepositSelection } from "../depositSelectionContext";
import { Address } from "@/lib/address/Address";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import DestinationTokenPicker from "../DestinationTokenPicker";
import { ImageWithFallback, WalletIcon } from "@layerswap/ui-kit/components";
import { ResolveConnectorIcon } from "@/components/Icons/ConnectorIcons";
import { useExtendedDepositOption } from "./useExtendedDepositOption";

import { MethodCard, MethodPickerView } from "./MethodPickerView";

const MethodPicker: FC = () => {
    const { push, setPresetSourceNetwork } = useDepositStep();
    const { wallets } = useWallet();
    const { destination, destinationToken } = useDepositSelection();
    const selectSourceAccount = useSelectSwapAccount("from");
    const { methods } = useDepositSettings();
    const hyperliquid = useExtendedDepositOption("hyperliquid");
    const polymarket = useExtendedDepositOption("polymarket");

    const canShow = (m: DepositMethodId) => methods.includes(m);
    const primaryWallet = wallets[0];
    const hasWallet = !!primaryWallet;
    const destinationReady = !!destination && !!destinationToken;
    // Extended-source shortcuts (e.g. Hyperliquid, Polymarket). Each card renders
    // whenever its source is configured; its enabled/loading state (not its
    // presence) reflects reachability, so it never flashes away.
    const extendedSources: { id: DepositMethodId; option: ReturnType<typeof useExtendedDepositOption> }[] = [
        { id: "hyperliquid", option: hyperliquid },
        { id: "polymarket", option: polymarket },
    ];

    const handleWalletClick = () => {
        if (!destinationReady) return;
        // Pick-any-source flow: clear any extended-source preset a prior method left.
        setPresetSourceNetwork(undefined);
        // Already connected: mark it as the latest source account (so SourceStep
        // scopes routes to it) and skip the connect modal. Otherwise hand off to
        // the connecting step, which opens the connect modal over a spinner.
        if (hasWallet) {
            selectSourceAccount(primaryWallet);
            push("wallet-source");
            return;
        }
        push("wallet-connect");
    };

    const handleTransferCryptoClick = () => {
        setPresetSourceNetwork(undefined);
        push("transfer-crypto");
    };

    const handleMoreWalletsClick = () => {
        if (!destinationReady) return;
        setPresetSourceNetwork(undefined);
        push("wallet-connect");
    };

    const handleExtendedClick = (option: ReturnType<typeof useExtendedDepositOption>) => {
        if (!destinationReady || !option.available || !option.networkName) return;
        setPresetSourceNetwork(option.networkName);
        // Skip straight to the amount step with the already-connected wallet — but
        // only when we don't positively know its balance is below the minimum
        // deposit. If it can't cover the minimum, route through connect so the user
        // can pick a funded wallet, then continue the normal flow.
        if (option.compatibleWallet && !option.compatibleWalletBelowMinimum) {
            selectSourceAccount(option.compatibleWallet);
            push("wallet-amount");
            return;
        }
        push("wallet-connect");
    };

    const walletDisabled = hasWallet && !destinationReady;
    const walletSubtitle = hasWallet
        ? `Connected · ${new Address(primaryWallet?.address, null, primaryWallet.providerName).toShortString()}`
        : "Connect a wallet";

    const walletCardIcon = hasWallet && primaryWallet?.icon
        ? <ImageWithFallback
            alt={primaryWallet.displayName ?? primaryWallet.id}
            className="h-7 w-7 object-contain"
            src={primaryWallet.icon}
            width="28"
            height="28"
        />
        : <ResolveConnectorIcon
            connector={primaryWallet?.providerName}
            iconClassName="w-[15px] h-[15px] p-px rounded bg-secondary-800 border border-secondary-400"
            className="grid grid-cols-2 gap-0.5"
        />;

    return (
        <MethodPickerView destinationPicker={<DestinationTokenPicker />}>
            {canShow("wallet") && (
                <MethodCard
                    icon={walletCardIcon}
                    title="Wallet transfer"
                    subtitle={walletSubtitle}
                    onClick={handleWalletClick}
                    disabled={walletDisabled}
                    disabledReason="Pick a destination first"
                />
            )}
            {canShow("deposit_address") && (
                <MethodCard
                    icon={<QrCode className="h-6 w-6 text-primary-text" />}
                    title="Deposit address"
                    subtitle="Send from any wallet or CEX"
                    onClick={handleTransferCryptoClick}
                    disabled={!destinationReady}
                    disabledReason="Pick a destination first"
                />
            )}
            {extendedSources.map(({ id, option }) => {
                if (!(option.present && canShow(id))) return null;
                const name = option.network?.display_name ?? "";
                const balanceLabel = (option.compatibleWalletBalance != null && option.compatibleWalletBalance > 0) && option.token
                    ? `Balance: ${truncateDecimals(option.compatibleWalletBalance, option.token.precision)} ${option.token.asset}`
                    : undefined;
                return (
                    <MethodCard
                        key={id}
                        icon={
                            <ImageWithFallback
                                src={option.network?.logo}
                                alt={`${name} logo`}
                                height={28}
                                width={28}
                                className="rounded-full object-contain"
                            />
                        }
                        title={`Deposit from ${name}`}
                        subtitle={
                            option.loading
                                ? "Checking availability…"
                                : option.available
                                    ? (balanceLabel ?? `From your ${name} balance`)
                                    : "Not available for this destination"
                        }
                        onClick={() => handleExtendedClick(option)}
                        loading={option.loading}
                        disabled={option.loading || !option.available || !destinationReady}
                        disabledReason={
                            !destinationReady
                                ? "Pick a destination first"
                                : `${name} can't reach this destination`
                        }
                    />
                );
            })}
            {canShow("wallet") && hasWallet && (
                <MethodCard
                    icon={<WalletIcon className="h-6 w-6 text-primary-text" strokeWidth={2} />}
                    title="More wallets"
                    subtitle="Use MetaMask, Phantom and more"
                    onClick={handleMoreWalletsClick}
                    disabled={!destinationReady}
                    disabledReason="Pick a destination first"
                />
            )}
        </MethodPickerView>
    );
};

export default MethodPicker;
