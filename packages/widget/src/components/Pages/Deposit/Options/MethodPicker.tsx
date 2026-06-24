import { FC, ReactNode } from "react";
import clsx from "clsx";
import { QrCode, ChevronRight, Loader2 } from "lucide-react";
import useWallet from "@/hooks/useWallet";
import { useSelectSwapAccount } from "@/context/swapAccounts";
import { useDepositSettings } from "@/context/depositSettings";
import { useDepositStep } from "../depositStepContext";
import { DepositMethodId } from "../depositMethods";
import { useDepositSelection } from "../depositSelectionContext";
import { Address } from "@/lib/address/Address";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import DestinationTokenPicker from "../DestinationTokenPicker";
import WalletIcon from "@/components/Icons/WalletIcon";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { useHyperliquidDepositOption } from "./useHyperliquidDepositOption";

type MethodCardProps = {
    icon: ReactNode;
    title: string;
    subtitle: string;
    onClick: () => void;
    disabled?: boolean;
    disabledReason?: string;
    /** Show a spinner instead of the chevron (and keep the card non-interactive)
     * while the method's availability is still resolving. */
    loading?: boolean;
};

const MethodCard: FC<MethodCardProps> = ({
    icon,
    title,
    subtitle,
    onClick,
    disabled,
    disabledReason,
    loading,
}) => {
    const nonInteractive = !!disabled || !!loading;
    return (
        <button
            type="button"
            disabled={!loading && !!disabled}
            aria-disabled={nonInteractive}
            aria-busy={loading}
            onClick={() => { if (nonInteractive) return; onClick(); }}
            title={disabled && !loading ? disabledReason : undefined}
            className={clsx(
                "group/card flex items-start gap-3.5 w-full text-left rounded-2xl px-4 py-3.5 transition-colors",
                "bg-secondary-500 hover:bg-secondary-400/70",
                "border border-transparent hover:border-secondary-300",
                "focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:outline-none",
                nonInteractive && "opacity-50 hover:bg-secondary-500 hover:border-transparent cursor-not-allowed",
            )}
        >
            <div className="shrink-0 h-[46px] w-[46px] rounded-xl flex items-center justify-center border bg-secondary-700 border-secondary-400" >
                {icon}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-primary-text text-base font-semibold truncate">{title}</span>
                <span className="text-secondary-text text-[13px] leading-tight truncate">{subtitle}</span>
            </div>
            {loading
                ? <Loader2 aria-hidden="true" className="h-5 w-5 text-primary-text-tertiary shrink-0 mt-2.5 animate-spin" />
                : <ChevronRight aria-hidden="true" className="h-5 w-5 text-primary-text-tertiary shrink-0 mt-2.5" />}
        </button>
    );
};

const MethodPicker: FC = () => {
    const { push, setPresetSourceNetwork } = useDepositStep();
    const { wallets } = useWallet();
    const { destination, destinationToken } = useDepositSelection();
    const selectSourceAccount = useSelectSwapAccount("from");
    const { methods } = useDepositSettings();
    const hyperliquid = useHyperliquidDepositOption();

    const canShow = (m: DepositMethodId) => methods.includes(m);
    const primaryWallet = wallets[0];
    const hasWallet = !!primaryWallet;
    const destinationReady = !!destination && !!destinationToken;
    // Render the card whenever Hyperliquid is configured; its enabled/loading
    // state (not its presence) reflects reachability, so it never flashes away.
    const showHyperliquid = hyperliquid.present && canShow("hyperliquid");
    // Surface the connected wallet's withdrawable HL balance once it resolves.
    const hyperliquidBalanceLabel = (hyperliquid.compatibleWalletBalance != null && hyperliquid.compatibleWalletBalance > 0) && hyperliquid.token
        ? `Balance: ${truncateDecimals(hyperliquid.compatibleWalletBalance, hyperliquid.token.precision)} ${hyperliquid.token.symbol}`
        : undefined;

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

    const handleHyperliquidClick = () => {
        if (!destinationReady || !hyperliquid.available || !hyperliquid.hlNetworkName) return;
        setPresetSourceNetwork(hyperliquid.hlNetworkName);
        // Skip straight to the amount step with the already-connected wallet — but
        // only when we don't positively know its Hyperliquid balance is below the
        // minimum deposit. If it can't cover the minimum, route through connect so
        // the user can pick a funded wallet, then continue the normal flow.
        if (hyperliquid.compatibleWallet && !hyperliquid.compatibleWalletBelowMinimum) {
            selectSourceAccount(hyperliquid.compatibleWallet);
            push("wallet-amount");
            return;
        }
        push("wallet-connect");
    };

    const walletDisabled = hasWallet && !destinationReady;
    const walletSubtitle = hasWallet
        ? `Connected · ${new Address(primaryWallet?.address, null, primaryWallet.providerName).toShortString()}`
        : "Connect a wallet";

    const WalletProviderIcon = primaryWallet?.icon;
    const walletCardIcon = hasWallet && WalletProviderIcon
        ? <ImageWithFallback
            alt={primaryWallet.displayName ?? primaryWallet.id}
            className="h-7 w-7 object-contain"
            src={primaryWallet.icon}
            width="28"
            height="28"
        />
        : <WalletIcon className="h-6 w-6 text-primary-text" strokeWidth={2} />;

    return (
        <div className="flex flex-col gap-2 w-full">
            <DestinationTokenPicker />

            <p className="text-secondary-text text-xs px-1 pt-0.5 mb-1">
                Choose how to fund this deposit
            </p>

            <div className="flex flex-col gap-2 w-full">
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
                {showHyperliquid && (
                    <MethodCard
                        icon={
                            <ImageWithFallback
                                src={hyperliquid.network?.logo}
                                alt="Hyperliquid logo"
                                height={28}
                                width={28}
                                className="rounded-full object-contain"
                            />
                        }
                        title="Deposit from Hyperliquid"
                        subtitle={
                            hyperliquid.loading
                                ? "Checking availability…"
                                : hyperliquid.available
                                    ? (hyperliquidBalanceLabel ?? "From your Hyperliquid balance")
                                    : "Not available for this destination"
                        }
                        onClick={handleHyperliquidClick}
                        loading={hyperliquid.loading}
                        disabled={hyperliquid.loading || !hyperliquid.available || !destinationReady}
                        disabledReason={
                            !destinationReady
                                ? "Pick a destination first"
                                : "Hyperliquid can't reach this destination"
                        }
                    />
                )}
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
            </div>
        </div>
    );
};

export default MethodPicker;
