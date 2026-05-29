import { FC } from "react";
import { useFormikContext } from "formik";
import clsx from "clsx";
import { QrCode, Wallet as WalletIcon, ChevronRight } from "lucide-react";
import useWallet from "@/hooks/useWallet";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { useDepositStep } from "../depositStepContext";

const shortAddress = (addr?: string) => {
    if (!addr || addr.length <= 8) return addr ?? "";
    return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
};

type MethodCardProps = {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    onClick: () => void;
    disabled?: boolean;
    disabledReason?: string;
};

const MethodCard: FC<MethodCardProps> = ({ icon, title, subtitle, onClick, disabled, disabledReason }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className={clsx(
            "group/card flex items-center gap-3 w-full text-left rounded-xl px-3.5 py-3 transition-colors",
            "bg-secondary-500 hover:bg-secondary-400/70",
            "focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:outline-none",
            "disabled:opacity-50 disabled:hover:bg-secondary-500 disabled:cursor-not-allowed",
        )}
    >
        <div className="shrink-0 h-10 w-10 rounded-lg bg-secondary-400 flex items-center justify-center">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-primary-text text-base font-semibold leading-tight">
                {title}
            </div>
            <div className="text-secondary-text text-xs mt-0.5 truncate">
                {subtitle}
            </div>
        </div>
        <ChevronRight className="h-4 w-4 text-secondary-text shrink-0" />
    </button>
);

const MethodPicker: FC = () => {
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
            await connect(undefined, { dismissible: true });
            return;
        }
        if (!destinationReady) return;
        setFieldValue("depositMethod", "wallet", false);
        push("wallet-amount");
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
        ? `${shortAddress(primaryWallet?.address)} · Instant`
        : "Connect a wallet";

    return (
        <div className="flex flex-col gap-2 w-full">
            <p className="text-secondary-text text-xs">Choose method</p>
            <div className="flex flex-col gap-2 w-full">
                <MethodCard
                    icon={<WalletIcon className="h-5 w-5 text-primary-text" />}
                    title="Wallet transfer"
                    subtitle={walletSubtitle}
                    onClick={handleWalletClick}
                    disabled={walletDisabled}
                    disabledReason="Pick a destination first"
                />
                <MethodCard
                    icon={<QrCode className="h-5 w-5 text-primary-text" />}
                    title="Deposit address"
                    subtitle="No limit · ~2 min"
                    onClick={handleTransferCryptoClick}
                    disabled={!destinationReady}
                    disabledReason="Pick a destination first"
                />
            </div>
        </div>
    );
};

export default MethodPicker;
