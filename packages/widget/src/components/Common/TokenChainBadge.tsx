import { FC } from "react";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";

type TokenChainBadgeProps = {
    tokenLogo?: string;
    tokenSymbol?: string;
    networkLogo?: string;
    networkName?: string;
    /** Token logo size in px. Wrapper grows slightly to accommodate the
     * corner network badge. Defaults to 32 (the trigger size). */
    size?: number;
    className?: string;
};

/**
 * Composed token + network avatar — a circular token logo with a small
 * rectangular network logo overlaid at the bottom-right corner. Used as the
 * leading visual in every "you send" / "you receive" picker, both the trigger
 * card and the dropdown rows.
 */
const TokenChainBadge: FC<TokenChainBadgeProps> = ({
    tokenLogo,
    tokenSymbol,
    networkLogo,
    networkName,
    size = 32,
    className,
}) => {
    const badge = Math.max(12, Math.round(size * 0.5));
    const wrapper = size + Math.round(badge / 4);
    const offset = wrapper - badge;
    return (
        <span
            className={`inline-flex items-start justify-start relative shrink-0${className ? ` ${className}` : ""}`}
            style={{ height: wrapper, width: wrapper }}
        >
            <span
                className="block rounded-full overflow-hidden"
                style={{ height: size, width: size }}
            >
                <ImageWithFallback
                    src={tokenLogo!}
                    alt={tokenSymbol ? `${tokenSymbol} logo` : "Token logo"}
                    height={size}
                    width={size}
                    loading="eager"
                    fetchPriority="high"
                    className="rounded-full object-contain"
                />
            </span>
            <span
                className="absolute rounded border border-secondary-500 bg-secondary-400 overflow-hidden"
                style={{ height: badge, width: badge, left: offset, top: offset }}
            >
                <ImageWithFallback
                    src={networkLogo!}
                    alt={networkName ? `${networkName} logo` : "Network logo"}
                    height={badge - 2}
                    width={badge - 2}
                    loading="eager"
                    fetchPriority="high"
                    className="object-contain"
                />
            </span>
        </span>
    );
};

export default TokenChainBadge;
