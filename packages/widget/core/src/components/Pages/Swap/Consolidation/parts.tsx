import { FC, ReactNode } from "react";
import clsx from "clsx";
import { CircleAlert, Fuel, Plus } from "lucide-react";
import { NetworkRoute, NetworkRouteToken } from "@layerswap/widget-types";
import { SelectedRouteDisplay } from "@/components/Input/RoutePicker/Routes";
import { useNamedAddress } from "@/stores/addressBookStore";
import { ImageWithFallback } from "@layerswap/ui-kit/components";
import WalletIconView from "@/components/Wallet/WalletIconView";
import { AccountIdentity } from "@/context/swapAccounts";
import { RowIssue } from "@/helpers/consolidation";

const PILL = "inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs leading-4 whitespace-nowrap";
const PILL_TONES = {
    default: "bg-secondary-300 text-secondary-text",
    strong: "bg-secondary-300 text-primary-text",
    warning: "bg-warning-background text-warning-foreground",
    error: "bg-error-background text-error-foreground",
};

export const Pill: FC<{ children: ReactNode, tone?: keyof typeof PILL_TONES, className?: string, onClick?: () => void, disabled?: boolean }> = ({ children, tone = "default", className, onClick, disabled }) => onClick
    ? <button type="button" disabled={disabled} onClick={e => { e.stopPropagation(); onClick(); }} className={clsx(PILL, PILL_TONES[tone], "cursor-pointer hover:bg-secondary-200 transition-colors duration-150 disabled:cursor-default disabled:opacity-50", className)}>{children}</button>
    : <span className={clsx(PILL, PILL_TONES[tone], className)}>{children}</span>;

export const IssueBadge: FC<{ issue: RowIssue, label?: string }> = ({ issue, label }) => (
    <Pill tone={issue.kind === "gas" ? "warning" : "error"}>
        {issue.kind === "gas" ? <Fuel className="w-3 h-3" /> : <CircleAlert className="w-3 h-3" />}
        <span>{label ?? issue.badge}</span>
    </Pill>
);

export const AddTokenButton: FC<{ onClick: () => void }> = ({ onClick }) => (
    <Pill tone="strong" onClick={onClick} className="pl-1.5 pr-2.5">
        <Plus className="w-4 h-4" />
        <span>Add token</span>
    </Pill>
);

/** Token logo with the network badge, as in the swap summary rows. */
export const TokenLogo: FC<{ tokenLogo?: string, networkLogo?: string, size?: 28 | 32, ring?: string }> = ({ tokenLogo, networkLogo, size = 32, ring = "border-secondary-500" }) => (
    <span className={clsx("relative inline-flex shrink-0", size === 32 ? "w-8 h-8" : "w-7 h-7")}>
        <ImageWithFallback src={tokenLogo ?? ""} alt="Token logo" width={size} height={size} loading="eager" className="rounded-full object-contain" />
        {networkLogo ? (
            <span className={clsx("absolute -right-0.5 -bottom-0.5 rounded border bg-secondary-400 overflow-hidden", ring)}>
                <ImageWithFallback src={networkLogo} alt="Network logo" width={16} height={16} loading="eager" className="object-contain" />
            </span>
        ) : null}
    </span>
);

export const StackedLogos: FC<{ logos: (string | undefined)[], ring?: string }> = ({ logos, ring = "border-secondary-400" }) => (
    <span className="flex shrink-0">
        {logos.slice(0, 3).map((logo, index) => (
            <span key={index} className={clsx("w-6 h-6 rounded-full border-2 overflow-hidden", ring, { "-ml-2": index > 0 })}>
                <ImageWithFallback src={logo ?? ""} alt="Token logo" width={20} height={20} className="rounded-full object-contain" />
            </span>
        ))}
    </span>
);

/** The form's route picker trigger, opening the multi-token picker instead. */
export const TokenChip: FC<{ route: NetworkRoute, token: NetworkRouteToken, onClick: () => void }> = ({ route, token, onClick }) => (
    <button
        type="button"
        data-attr="consolidation-route-picker"
        onClick={e => { e.stopPropagation(); onClick(); }}
        className="rounded-2xl flex items-center relative text-left py-1.5 px-2 pr-0 bg-secondary-300 hover:bg-secondary-200 font-semibold active:animate-press-down"
    >
        <SelectedRouteDisplay route={route} token={token} placeholder="Select token" />
    </button>
);

/** The source wallet chip, without the switcher: the wallet can't change once several tokens are lined up from it. */
export const LockedWalletChip: FC<{ account: AccountIdentity | undefined, network: NetworkRoute | undefined }> = ({ account, network }) => {
    const label = useNamedAddress(account?.address, network);
    if (!account?.address) return null;
    return (
        <span className="rounded-lg flex items-center space-x-2 text-sm py-1 pl-2 pr-2">
            <span className="rounded-lg flex space-x-1 items-center">
                <span className="inline-flex items-center relative px-0.5">
                    <WalletIconView wallet={account} className="w-4 h-4" size={16} />
                </span>
                <span className="text-secondary-text truncate max-w-24">{label}</span>
            </span>
        </span>
    );
};

export const Dot: FC = () => <span className="text-primary-text-tertiary">·</span>;

export const formatAmount = (value: number | string | undefined, decimals = 6) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return number.toLocaleString("en-US", { minimumFractionDigits: number >= 1 ? 2 : 0, maximumFractionDigits: number >= 1 ? 2 : decimals });
};

export const formatUsdValue = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
