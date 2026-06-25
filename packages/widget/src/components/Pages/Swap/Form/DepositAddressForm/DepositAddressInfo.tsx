import { FC, useMemo } from "react";
import { Copy, Check } from "lucide-react";
import StyledQRCode from "@/components/Common/StyledQRCode";
import { AnimatePresence, motion } from "framer-motion";
import useCopyClipboard from "@/hooks/useCopyClipboard";
import { Network, Token } from "@/Models/Network";
import DepositQuoteDetails from "./DepositQuoteDetails";

type DepositAddressInfoProps = {
    sourceNetwork: Network | undefined;
    sourceToken: Token | undefined;
    destinationNetwork: Network | undefined;
    destinationToken: Token | undefined;
    destinationAddress: string | undefined;
    refuel: boolean;
    depositAddress: string | undefined;
    isCreatingSwap: boolean;
}

const DepositAddressInfo: FC<DepositAddressInfoProps> = ({
    sourceNetwork,
    sourceToken,
    destinationNetwork,
    destinationToken,
    destinationAddress,
    refuel,
    depositAddress,
    isCreatingSwap,
}) => {
    const [copied, copy] = useCopyClipboard();

    const handleCopy = () => {
        if (depositAddress) copy(depositAddress);
    };

    const depositAddressParts = useMemo(() => {
        if (!depositAddress || depositAddress.length <= 8) {
            return { start: depositAddress ?? '', middle: '', end: '' };
        }
        return {
            start: depositAddress.slice(0, 4),
            middle: depositAddress.slice(4, -4),
            end: depositAddress.slice(-4),
        };
    }, [depositAddress]);

    return (
        <div className="flex flex-col gap-3 overflow-hidden">
            <div>
                <div className="flex items-stretch bg-secondary-500 rounded-2xl overflow-hidden">
                    <div className="shrink-0 bg-secondary-300 p-2.5 flex items-center">
                        {isCreatingSwap || !depositAddress ? (
                            <div className="h-[140px] w-[140px] bg-secondary-100 rounded animate-pulse" />
                        ) : (
                            <StyledQRCode
                                value={depositAddress}
                                size={140}
                                logo={sourceNetwork?.logo}
                            />
                        )}
                    </div>
                    <div className="flex-1 min-w-0 p-3.5 flex items-center justify-center">
                        {isCreatingSwap || !depositAddress ? (
                            <span className="inline-block bg-secondary-300 h-6 rounded animate-pulse w-32" />
                        ) : (
                            <button
                                type="button"
                                onClick={handleCopy}
                                aria-label={copied ? 'Copied' : 'Copy deposit address'}
                                className="group/copy cursor-pointer text-left"
                                style={{ maxWidth: `${Math.ceil(depositAddress.length / 3) + 2}ch` }}
                            >
                                <span className={`font-mono text-lg leading-snug block break-all transition-colors ${copied ? 'text-primary-text' : 'text-secondary-text group-hover/copy:text-primary-text'}`}>
                                    <span className="text-primary-text font-medium">{depositAddressParts.start}</span>
                                    {depositAddressParts.middle}
                                    <span className="whitespace-nowrap">
                                        <span className="text-primary-text font-medium">{depositAddressParts.end}</span>
                                        <span className="inline-flex items-center align-middle ml-1 w-4 h-4 relative">
                                            <AnimatePresence mode="wait" initial={false}>
                                                {copied ? (
                                                    <motion.span
                                                        key="check"
                                                        initial={{ scale: 0.6, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.6, opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute inset-0 inline-flex items-center justify-center"
                                                    >
                                                        <Check className="h-4 w-4 text-secondary-text group-hover/copy:text-primary-text transition-colors" />
                                                    </motion.span>
                                                ) : (
                                                    <motion.span
                                                        key="copy"
                                                        initial={{ scale: 0.6, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.6, opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute inset-0 inline-flex items-center justify-center"
                                                    >
                                                        <Copy className="h-4 w-4 text-secondary-text group-hover/copy:text-primary-text transition-colors" />
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </span>
                                    </span>
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Min / Max / Fees + fee calculator */}
            <DepositQuoteDetails
                sourceNetwork={sourceNetwork}
                sourceToken={sourceToken}
                destinationNetwork={destinationNetwork}
                destinationToken={destinationToken}
                destinationAddress={destinationAddress}
                refuel={refuel}
                isCreatingSwap={isCreatingSwap}
            />
        </div>
    );
};

export default DepositAddressInfo;
