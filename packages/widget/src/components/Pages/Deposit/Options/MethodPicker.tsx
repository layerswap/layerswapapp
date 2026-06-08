import { FC, ReactNode } from "react";
import clsx from "clsx";
import { QrCode, Wallet as WalletIcon, WalletCards, ChevronRight } from "lucide-react";
import useWallet from "@/hooks/useWallet";
import { useDepositStep } from "../depositStepContext";
import { useDepositSelection } from "../depositSelectionContext";
import { Address } from "@/lib/address/Address";
import DestinationTokenPicker from "../DestinationTokenPicker";

type MethodCardProps = {
    icon: ReactNode;
    title: string;
    subtitle: string;
    onClick: () => void;
    disabled?: boolean;
    disabledReason?: string;
};

const MethodCard: FC<MethodCardProps> = ({
    icon,
    title,
    subtitle,
    onClick,
    disabled,
    disabledReason,
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className={clsx(
            "group/card flex items-start gap-3.5 w-full text-left rounded-2xl px-4 py-3.5 transition-colors",
            "bg-secondary-500 hover:bg-secondary-400/70",
            "border border-transparent hover:border-secondary-300",
            "focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:outline-none",
            "disabled:opacity-50 disabled:hover:bg-secondary-500 disabled:hover:border-transparent disabled:cursor-not-allowed",
        )}
    >
        <div className="shrink-0 h-[46px] w-[46px] rounded-xl flex items-center justify-center border bg-secondary-700 border-secondary-400" >
            {icon}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
            <span className="text-primary-text text-base font-semibold truncate">{title}</span>
            <span className="text-secondary-text text-[13px] leading-tight truncate">{subtitle}</span>
        </div>
        <ChevronRight className="h-5 w-5 text-primary-text-tertiary shrink-0 mt-2.5" />
    </button>
);

const MethodPicker: FC = () => {
    const { push } = useDepositStep();
    const { wallets } = useWallet();
    const { destination, destinationToken } = useDepositSelection();

    const primaryWallet = wallets[0];
    const hasWallet = !!primaryWallet;
    const destinationReady = !!destination && !!destinationToken;

    const handleWalletClick = () => {
        // Already connected: go straight to the source step (once a destination
        // is picked). Otherwise open the inline connect step, which advances to
        // the source step on success (or back here if no destination yet).
        if (hasWallet) {
            if (destinationReady) push("wallet-source");
            return;
        }
        push("wallet-connect");
    };

    const handleTransferCryptoClick = () => {
        push("transfer-crypto");
    };

    const handleMoreWalletsClick = () => {
        push("wallet-ecosystem");
    };

    // The wallet flow lands on AmountStep, which requires a destination to
    // produce a quote. Keep the card actionable while disconnected (so the
    // inline connect step can still open) but block forward navigation until ready.
    const walletDisabled = hasWallet && !destinationReady;
    const walletSubtitle = hasWallet
        ? `Connected · ${new Address(primaryWallet?.address, null, primaryWallet.providerName).toShortString()}`
        : "Connect a wallet";

    const WalletProviderIcon = primaryWallet?.icon;
    const walletCardIcon = hasWallet && WalletProviderIcon
        ? <WalletProviderIcon className="h-7 w-7" />
        : <WalletIcon className="h-6 w-6 text-primary-text" />;

    return (
        <div className="flex flex-col gap-2 w-full">
            <DestinationTokenPicker />

            <p className="text-secondary-text text-xs px-1 pt-0.5 mb-1">
                Choose how to fund this deposit
            </p>

            <div className="flex flex-col gap-2 w-full">
                <MethodCard
                    icon={walletCardIcon}
                    title="Wallet transfer"
                    subtitle={walletSubtitle}
                    onClick={handleWalletClick}
                    disabled={walletDisabled}
                    disabledReason="Pick a destination first"
                />
                <MethodCard
                    icon={<QrCode className="h-6 w-6 text-primary-200" />}
                    title="Deposit address"
                    subtitle="Send from any wallet, exchange or CEX"
                    onClick={handleTransferCryptoClick}
                    disabled={!destinationReady}
                    disabledReason="Pick a destination first"
                />
                <MethodCard
                    icon={<WalletCards className="h-6 w-6 text-primary-200" />}
                    title="More wallets"
                    subtitle="Use MetaMask, Coinbase or more"
                    onClick={handleMoreWalletsClick}
                    disabled={!destinationReady}
                    disabledReason="Pick a destination first"
                />
            </div>
        </div>
    );
};

export default MethodPicker;
