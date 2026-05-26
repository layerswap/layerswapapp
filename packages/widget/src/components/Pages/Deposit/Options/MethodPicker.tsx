import { FC, useMemo } from "react";
import { useFormikContext } from "formik";
import clsx from "clsx";
import { QrCode, Wallet as WalletIcon, ChevronRight } from "lucide-react";
import useWallet from "@/hooks/useWallet";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import useDepositAddressAvailableRoutes from "@/hooks/useDepositAddressAvailableRoutes";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { useDepositStep } from "../depositStepContext";

const shortAddress = (addr?: string) => {
    if (!addr || addr.length <= 8) return addr ?? "";
    return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
};

const MethodPicker: FC = () => {
    const { setFieldValue, values } = useFormikContext<SwapFormValues>();
    const { push } = useDepositStep();
    const { wallets } = useWallet();
    const { connect } = useConnectModal();

    const destination = values?.to as NetworkRoute | undefined;
    const destinationToken = values?.toAsset as NetworkRouteToken | undefined;
    const { availableRoutes } = useDepositAddressAvailableRoutes(destination?.name, destinationToken?.symbol);

    const sampleNetworks = useMemo(() => availableRoutes.slice(0, 8), [availableRoutes]);

    const primaryWallet = wallets[0];
    const hasWallet = !!primaryWallet;

    const handleWalletClick = async () => {
        if (!hasWallet) {
            await connect(undefined, { dismissible: true });
            return;
        }
        setFieldValue("depositMethod", "wallet", false);
        push("wallet-amount");
    };

    const handleTransferCryptoClick = () => {
        setFieldValue("depositMethod", "deposit_address", false);
        push("transfer-crypto");
    };

    return (
        <div className="flex flex-col gap-2 w-full">
            {/* Wallet card */}
            <button
                type="button"
                onClick={handleWalletClick}
                className="group/card flex items-center gap-3 w-full text-left bg-secondary-500 hover:bg-secondary-400/70 rounded-xl px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:outline-none"
            >
                <div className="shrink-0 h-10 w-10 rounded-lg bg-secondary-400 ring-1 ring-inset ring-secondary-300/40 flex items-center justify-center">
                    <WalletIcon className="h-5 w-5 text-primary-text" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-primary-text text-sm font-medium">
                        {hasWallet ? `Wallet (${shortAddress(primaryWallet?.address)})` : "Wallet"}
                    </div>
                    <div className="text-secondary-text text-xs">
                        {hasWallet ? "Instant" : "Connect a wallet"}
                    </div>
                </div>
                <ChevronRight className="h-4 w-4 text-secondary-text shrink-0" />
            </button>

            {/* Transfer Crypto card */}
            <button
                type="button"
                onClick={handleTransferCryptoClick}
                disabled={!destination || !destinationToken}
                title={!destination || !destinationToken ? "Pick a destination first" : undefined}
                className={clsx(
                    "group/card flex items-center gap-3 w-full text-left rounded-xl px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:outline-none",
                    "bg-secondary-500 hover:bg-secondary-400/70",
                    "disabled:opacity-50 disabled:hover:bg-secondary-500 disabled:cursor-not-allowed"
                )}
            >
                <div className="shrink-0 h-10 w-10 rounded-lg bg-secondary-400 ring-1 ring-inset ring-secondary-300/40 flex items-center justify-center">
                    <QrCode className="h-5 w-5 text-primary-text" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-primary-text text-sm font-medium">Transfer Crypto</div>
                    <div className="text-secondary-text text-xs">No limit · ~2 min</div>
                </div>
                <div className="flex -space-x-2 shrink-0 [&>*:nth-child(n+4)]:hidden sm:[&>*:nth-child(n+4)]:flex sm:[&>*:nth-child(n+6)]:hidden">
                    {sampleNetworks.map((n) => (
                        <div
                            key={n.name}
                            className="h-5 w-5 rounded-full border-2 border-secondary-500 bg-secondary-400 overflow-hidden"
                            title={n.display_name}
                        >
                            <ImageWithFallback
                                src={n.logo}
                                alt={n.display_name}
                                width="20"
                                height="20"
                                className="h-full w-full object-contain"
                            />
                        </div>
                    ))}
                </div>
                <ChevronRight className="h-4 w-4 text-secondary-text shrink-0" />
            </button>
        </div>
    );
};

export default MethodPicker;
