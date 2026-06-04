import { FC, ReactNode } from "react";
import { useFormikContext } from "formik";
import clsx from "clsx";
import { QrCode, Wallet as WalletIcon, ChevronRight } from "lucide-react";
import useWallet from "@/hooks/useWallet";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { useDepositStep } from "../depositStepContext";
import { Address } from "@/lib/address/Address";
import DestinationTokenPicker, { SupportedDestination } from "../DestinationTokenPicker";

type Badge = {
    label: string;
    tone: "fast" | "any";
};

type MethodCardProps = {
    icon: ReactNode;
    iconTone?: "neutral" | "wallet";
    title: string;
    subtitle: string;
    onClick: () => void;
    disabled?: boolean;
    disabledReason?: string;
};

const badgeStyles: Record<Badge["tone"], string> = {
    fast: "bg-success-background text-success-foreground",
    any: "bg-secondary-400/60 text-secondary-text",
};

const MethodCard: FC<MethodCardProps> = ({
    icon,
    iconTone = "neutral",
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
        <div
            className={clsx(
                "shrink-0 h-[46px] w-[46px] rounded-xl flex items-center justify-center border",
                iconTone === "wallet"
                    ? "bg-[#1c1408] border-[#3a2a12]"
                    : "bg-secondary-700 border-secondary-400",
            )}
        >
            {icon}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
            <span className="text-primary-text text-base font-semibold truncate">{title}</span>
            <span className="text-secondary-text text-[13px] leading-tight truncate">{subtitle}</span>
        </div>
        <ChevronRight className="h-5 w-5 text-primary-text-tertiary shrink-0 mt-2.5" />
    </button>
);

type Props = {
    destinations: SupportedDestination[];
};

const MethodPicker: FC<Props> = ({ destinations }) => {
    const { setFieldValue, values } = useFormikContext<SwapFormValues>();
    const { push } = useDepositStep();
    const { wallets } = useWallet();
    const { connect } = useConnectModal();

    const destination = values?.to as NetworkRoute | undefined;
    const destinationToken = values?.toAsset as NetworkRouteToken | undefined;

    const primaryWallet = wallets[0];
    const hasWallet = !!primaryWallet;
    const destinationReady = !!destination && !!destinationToken;

    const handleWalletClick = async () => {
        if (!hasWallet) {
            const connectedWallet = await connect(undefined, { dismissible: true, fullHeight: true });
            if (!connectedWallet) return;
        }
        if (!destinationReady) return;
        setFieldValue("depositMethod", "wallet", false);
        push("wallet-source");
    };

    const handleTransferCryptoClick = () => {
        setFieldValue("depositMethod", "deposit_address", false);
        push("transfer-crypto");
    };

    // The wallet flow lands on AmountStep, which requires a destination to
    // produce a quote. Keep the card actionable while disconnected (so the
    // connect modal still opens) but block forward navigation until ready.
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
            <DestinationTokenPicker destinations={destinations} />

            <div>
                <p className="text-secondary-text text-xs px-1 pt-0.5 mb-1">
                    Choose how to fund this deposit
                </p>

                <div className="flex flex-col gap-2 w-full">
                    <MethodCard
                        icon={walletCardIcon}
                        iconTone={hasWallet ? "wallet" : "neutral"}
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
                </div>
            </div>
        </div>
    );
};

export default MethodPicker;
