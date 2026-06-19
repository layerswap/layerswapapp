import { FC, ReactNode } from "react";
import clsx from "clsx";
import { QrCode, ChevronRight } from "lucide-react";
import useWallet from "@/hooks/useWallet";
import { useSelectSwapAccount } from "@/context/swapAccounts";
import { useDepositStep } from "../depositStepContext";
import { useDepositSelection } from "../depositSelectionContext";
import { Address } from "@/lib/address/Address";
import DestinationTokenPicker from "../DestinationTokenPicker";
import WalletIcon from "@/components/Icons/WalletIcon";

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
    const selectSourceAccount = useSelectSwapAccount("from");

    const primaryWallet = wallets[0];
    const hasWallet = !!primaryWallet;
    const destinationReady = !!destination && !!destinationToken;

    const handleWalletClick = () => {
        if (!destinationReady) return;
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
        push("transfer-crypto");
    };

    const handleMoreWalletsClick = () => {
        if (!destinationReady) return;
        push("wallet-connect");
    };

    const walletDisabled = hasWallet && !destinationReady;
    const walletSubtitle = hasWallet
        ? `Connected · ${new Address(primaryWallet?.address, null, primaryWallet.providerName).toShortString()}`
        : "Connect a wallet";

    const WalletProviderIcon = primaryWallet?.icon;
    const walletCardIcon = hasWallet && WalletProviderIcon
        ? <WalletProviderIcon className="h-7 w-7" />
        : <WalletIcon className="h-6 w-6 text-primary-text" strokeWidth={2} />;

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
                    icon={<QrCode className="h-6 w-6 text-primary-text" />}
                    title="Deposit address"
                    subtitle="Send from any wallet or CEX"
                    onClick={handleTransferCryptoClick}
                    disabled={!destinationReady}
                    disabledReason="Pick a destination first"
                />
                {hasWallet && (
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
