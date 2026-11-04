import { FC, useState } from "react";
import clsx from "clsx";
import { X, CircleAlert } from "lucide-react";
import { useFormikContext } from "formik";
import { NetworkRoute, NetworkRouteToken } from "@layerswap/widget-types";
import NumericInput from "@/components/Input/NumericInput";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useConsolidationQuotes, useConsolidationRow } from "@/context/consolidationQuotes";
import useWallet from "@/hooks/useWallet";
import { useBalance } from "@/lib/balances/useBalance";
import { calculatePresetAmount, supportsLiveAmountPreset } from "@/lib/amountPresets";
import { resolverService } from "@/lib/resolvers/resolverService";
import { resolveGasBalanceBudget } from "@/lib/gases/resolveGasBalanceBudget";
import { truncateToDecimals } from "@/components/utils/RoundDecimals";
import { SwapFormValues } from "../Form/SwapFormValues";
import Balance from "@/components/Input/Amount/Balance";
import { formatUsdValue, IssueBadge, Pill, TokenChip } from "./parts";

type Props = {
    id: string;
    from: NetworkRoute;
    fromAsset: NetworkRouteToken;
    amount: string;
    /** The form's own source, edited through `amount`. */
    primary?: boolean;
    /** Position in `extraSources` for an extra row. */
    index?: number;
    onChangeToken: () => void;
    onRemove: () => void;
};

const SourceRow: FC<Props> = ({ id, from, fromAsset, amount, primary, index, onChangeToken, onRemove }) => {
    const { values, setValues, setFieldValue } = useFormikContext<SwapFormValues>();
    const report = useConsolidationRow(id);
    const { rows, issues } = useConsolidationQuotes();
    const issue = issues[id];
    const account = useSelectedAccount("from", from.name);
    const { wallets } = useWallet(from, "withdrawal");
    const wallet = wallets.find(w => w.id === account?.id);
    const { balances } = useBalance(account?.address, from);
    const [maxValue, setMaxValue] = useState<string>();
    const [maxPending, setMaxPending] = useState(false);

    const setAmount = (value: string) => {
        if (primary) void setValues({ ...values, amount: value, amountMode: "manual", amountPresetSource: undefined, amountPresetPending: false, amountPresetError: undefined }, true);
        else void setFieldValue(`extraSources.${index}.amount`, value, true);
    };

    const noRoute = issue?.kind === "no_route";
    const canUseMax = !!account?.address && !!wallet && report?.maxAmount != null && supportsLiveAmountPreset(from, fromAsset) && !noRoute;
    // For a native token, also leave gas for the other transfers on this network.
    const otherGasOnNetwork = report?.isNative
        ? rows.filter(row => row.id !== id && row.network === from.name && row.gas).reduce((sum, row) => sum + resolveGasBalanceBudget(row.gas) * (row.isNative ? 1 : 2), 0)
        : 0;
    const handleMax = async () => {
        if (!account?.address || !wallet) return;
        setMaxPending(true);
        try {
            const value = await calculatePresetAmount({
                network: from,
                token: fromAsset,
                balance: balances?.find(b => b.network === from.name && b.token === fromAsset.symbol),
                limit: report?.maxAmount,
                minimum: report?.minAmount,
                mode: "max",
                estimateGas: async gasAmount => resolverService.getGasResolver().getGas({ address: account.address, network: from, token: fromAsset, amount: gasAmount, wallet }),
            });
            const adjusted = otherGasOnNetwork ? truncateToDecimals(String(Math.max(0, Number(value) - otherGasOnNetwork)), fromAsset.decimals) : value;
            setMaxValue(adjusted);
            setAmount(adjusted);
        } catch {
            setMaxValue(undefined);
        } finally {
            setMaxPending(false);
        }
    };

    const usdText = formatUsdValue((Number(amount) || 0) * (report?.priceUsd ?? fromAsset.price_in_usd ?? 0));
    const maxSelected = !!maxValue && maxValue === amount;
    const showBadge = !!issue?.badge && (issue.kind === "gas" || ((issue.kind === "min" || issue.kind === "max" || issue.kind === "balance") && !!amount));
    const balanceValues: SwapFormValues = primary ? values : { ...values, from, fromAsset, amount, amountMode: "fixed", extraSources: undefined };

    return (
        <>
            <div className="flex items-center gap-2 py-3">
                <div className={clsx("flex-1 min-w-0", { "opacity-45": noRoute })}>
                    <NumericInput
                        name={primary ? "amount" : `extraSources.${index}.amount`}
                        placeholder="0"
                        precision={fromAsset.decimals}
                        disabled={noRoute}
                        className="w-full h-7! text-2xl leading-7 bg-secondary-500! text-primary-text placeholder:text-primary-text-tertiary font-normal! px-0 rounded-none focus:outline-none focus:ring-0 border-0 truncate"
                        onChange={e => {
                            if (/^[0-9]*[.,]?[0-9]*$/.test(e.target.value)) setAmount(e.target.value.replace(",", "."));
                        }}
                    />
                    <div className="mt-1 flex items-center gap-2 text-xs leading-4 text-secondary-text">
                        <span>{usdText}</span>
                        <span className="inline-flex gap-0.5 rounded-lg bg-secondary-300/35 p-0.5 font-medium">
                            <button
                                type="button"
                                aria-pressed={maxSelected}
                                disabled={!canUseMax || maxPending}
                                onClick={e => { e.stopPropagation(); void handleMax(); }}
                                className={clsx("relative min-w-11 rounded-md px-2 py-0.5 transition-colors duration-150 disabled:text-secondary-text/40 disabled:cursor-default",
                                    maxSelected ? "bg-preset-selected text-preset-selected-text" : "text-preset-text enabled:hover:bg-secondary-300/50 enabled:hover:text-primary-text")}
                            >
                                Max
                            </button>
                        </span>
                        {showBadge && issue ? <IssueBadge issue={issue} /> : null}
                    </div>
                </div>
                <div className={clsx("self-start flex flex-col items-center", { "opacity-45": noRoute })}>
                    <TokenChip route={from} token={fromAsset} onClick={onChangeToken} />
                    <Balance values={balanceValues} direction="from" minAllowedAmount={report?.minAmount} maxAllowedAmount={report?.maxAmount} />
                </div>
                <button
                    type="button"
                    aria-label={`Remove ${fromAsset.asset} on ${from.display_name}`}
                    onClick={e => { e.stopPropagation(); onRemove(); }}
                    className="self-start mt-2 inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-full text-secondary-text hover:text-primary-text hover:bg-secondary-400 transition-colors duration-150"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            {
                noRoute && issue?.detail ? (
                    <div className="flex items-center gap-1.5 -mt-1 mb-3 text-sm leading-5 text-error-foreground">
                        <CircleAlert className="w-4 h-4 shrink-0" />
                        <span className="truncate">{issue.detail}</span>
                        <span className="ml-auto flex gap-1 shrink-0">
                            <Pill tone="strong" onClick={onChangeToken}>Change</Pill>
                            <Pill tone="strong" onClick={onRemove}>Remove</Pill>
                        </span>
                    </div>
                ) : null
            }
        </>
    );
};

export default SourceRow;
