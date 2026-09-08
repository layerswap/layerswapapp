import Image from "next/image";
import Link from "next/link";
import { formatAmount } from "@/helpers/formatAmount";

interface NetworkAssetDisplayProps {
    label: "Token" | "Source" | "Destination";
    tokenLogo?: string;
    tokenAmount?: number;
    tokenSymbol?: string;
    networkLogo?: string;
    networkName?: string;
    explorerUrl?: string;
    showAmount?: boolean;
    index?: number;
    onLinkClick?: (e: React.MouseEvent) => void;
}

export default function NetworkAssetDisplay({
    label,
    tokenLogo,
    tokenAmount,
    tokenSymbol,
    networkLogo,
    networkName,
    explorerUrl,
    showAmount = true,
    index = 0,
    onLinkClick,
}: NetworkAssetDisplayProps) {
    const isTokenRow = label === "Token";

    if (isTokenRow) {
        return (
            <div className="text-sm md:text-base flex flex-row mb-1">
                <div className="flex flex-row items-center ml-4 whitespace-nowrap">
                    <div className="relative h-4 w-4 md:h-5 md:w-5">
                        <Image
                            alt={`${label} icon ${index}`}
                            src={tokenLogo || ''}
                            width={20}
                            height={20}
                            decoding="async"
                            className="rounded-md"
                        />
                    </div>
                    <div className="mx-2.5">
                        {showAmount && tokenAmount !== undefined ? (
                            <>
                                <span className="text-primary-text">{formatAmount(tokenAmount)}</span>
                                <span className="mx-1 text-primary-text">{tokenSymbol}</span>
                            </>
                        ) : (
                            <span className="ml-2.5">-</span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="text-sm md:text-base flex flex-row items-center ml-4">
            <div className="relative h-4 w-4 md:h-5 md:w-5">
                <Image
                    alt={`${label} chain icon ${index}`}
                    src={networkLogo || ''}
                    width={20}
                    height={20}
                    decoding="async"
                    className="rounded-md"
                />
            </div>
            <div className="mx-2 text-primary-text">
                <Link
                    href={explorerUrl || '#'}
                    onClick={onLinkClick}
                    target="_blank"
                    className="inline-flex w-fit items-center hover:text-secondary-text"
                >
                    <span className={`mx-0.5 hover:text-secondary-text ${explorerUrl ? 'underline' : ''}`}>
                        {networkName}
                    </span>
                </Link>
            </div>
        </div>
    );
}
