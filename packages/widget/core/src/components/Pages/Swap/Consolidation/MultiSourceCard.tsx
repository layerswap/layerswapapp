import { FC, ReactNode, useCallback, useState } from "react";
import { useFormikContext } from "formik";
import { ChevronRight } from "lucide-react";
import VaulDrawer from "@/components/Modal/vaulModal";
import SubmitButton from "@/components/Buttons/submitButton";
import WarningMessage from "@/components/Common/WarningMessage";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useConsolidationQuotes } from "@/context/consolidationQuotes";
import useFormRoutes from "@/hooks/useFormRoutes";
import { GasShortfall, MAX_CONSOLIDATION_SOURCES, PRIMARY_ROW_ID } from "@/helpers/consolidation";
import { ConsolidationSource, SwapFormValues } from "../Form/SwapFormValues";
import SourceRow from "./SourceRow";
import SourceRowReporter from "./SourceRowReporter";
import { TokenPickerMode } from "./TokenPicker";
import { AddTokenButton, Dot, formatUsdValue, IssueBadge, LockedWalletChip, StackedLogos } from "./parts";

type Props = {
    onPick: (mode: TokenPickerMode) => void;
    canAdd: boolean;
};

/** Replaces the "Send from" card once more than one token is lined up. */
const MultiSourceCard: FC<Props> = ({ onPick, canAdd }) => {
    const { values, setValues, setFieldValue } = useFormikContext<SwapFormValues>();
    const { from, fromAsset } = values;
    const extraSources = values.extraSources ?? [];
    const account = useSelectedAccount("from", from?.name);
    const { allRoutes } = useFormRoutes({ direction: "from", values });
    const summary = useConsolidationQuotes();
    const [showSheet, setShowSheet] = useState(false);

    const removeExtra = useCallback((id: string) => {
        const remaining = extraSources.filter(source => source.id !== id);
        void setFieldValue("extraSources", remaining.length ? remaining : undefined, true);
    }, [extraSources, setFieldValue]);
    // Removing the form's own source promotes the next one into its place.
    const removePrimary = useCallback(() => {
        const [next, ...rest] = extraSources;
        if (!next) return;
        void setValues({
            ...values, from: next.from, fromAsset: next.fromAsset, amount: next.amount,
            amountMode: "manual", amountPresetSource: undefined, amountPresetPending: false, amountPresetError: undefined,
            extraSources: rest.length ? rest : undefined,
        }, true);
    }, [values, extraSources, setValues]);

    if (!from || !fromAsset) return null;

    const total = extraSources.length + 1;
    const collapsed = total >= 3;
    const isAvailable = (source: ConsolidationSource) => allRoutes.some(route => route.name === source.from.name && route.tokens.some(token => token.symbol === source.fromAsset.symbol));
    const primaryRow = (
        <SourceRow id={PRIMARY_ROW_ID} from={from} fromAsset={fromAsset} amount={values.amount ?? ""} primary
            onChangeToken={() => onPick({ kind: "replace", id: PRIMARY_ROW_ID })} onRemove={removePrimary} />
    );
    const extraRow = (source: ConsolidationSource, index: number) => (
        <SourceRow key={source.id} id={source.id} from={source.from} fromAsset={source.fromAsset} amount={source.amount} index={index}
            onChangeToken={() => onPick({ kind: "replace", id: source.id })} onRemove={() => removeExtra(source.id)} />
    );
    const withDividers = (rows: ReactNode[]) => rows.map((row, index) => (
        <div key={index}>
            {index > 0 ? <div className="h-px bg-secondary-300" /> : null}
            {row}
        </div>
    ));
    const footer = (
        <div className="flex items-center justify-between pt-3 border-t border-secondary-300">
            {canAdd && total < MAX_CONSOLIDATION_SOURCES ? <AddTokenButton onClick={() => onPick({ kind: "add" })} /> : <span />}
            <span className="text-xs leading-4 text-secondary-text">{`${total} of ${MAX_CONSOLIDATION_SOURCES}`}</span>
        </div>
    );
    const totalUsd = summary.rows.reduce((sum, row) => sum + (Number(row.amount) || 0) * (row.priceUsd ?? 0), 0);
    const issueCount = summary.rows.filter(row => summary.issues[row.id]?.badge).length;
    const issueText = issueCount === 1 ? "1 issue" : `${issueCount} issues`;
    const countText = `${total} tokens`;

    return (
        <section className="w-full bg-secondary-500 rounded-2xl p-4 pb-3" aria-label="Send from">
            <SourceRowReporter id={PRIMARY_ROW_ID} from={from} fromAsset={fromAsset} amount={values.amount ?? ""} routeAvailable />
            {extraSources.map(source => <SourceRowReporter key={source.id} id={source.id} from={source.from} fromAsset={source.fromAsset} amount={source.amount} routeAvailable={isAvailable(source)} />)}

            <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-base leading-6 text-secondary-text">
                    <span>Send from </span><Dot /><span>{` ${countText}`}</span>
                </span>
                <LockedWalletChip account={account} network={from} />
            </div>
            {collapsed ? primaryRow : withDividers([primaryRow, ...extraSources.map(extraRow)])}
            {collapsed ? <MoreTokensRow sources={extraSources} onClick={() => setShowSheet(true)} /> : null}
            {summary.gasShortfalls.map(shortfall => <GasWarning key={shortfall.network} shortfall={shortfall} />)}
            {footer}

            <VaulDrawer
                show={showSheet && collapsed}
                setShow={setShowSheet}
                header={
                    <span className="flex flex-col">
                        <span className="text-xl leading-7 font-semibold text-primary-text">
                            <span>Send from </span>
                            <span className="font-normal text-secondary-text">{`· ${countText}`}</span>
                        </span>
                        <span className="text-sm leading-5 font-normal text-secondary-text">
                            <span>{`Total ${formatUsdValue(totalUsd)}`}</span>
                            {issueCount ? <span>{" "}<Dot />{" "}<span className="text-error-foreground">{issueText}</span></span> : null}
                        </span>
                    </span>
                }
                modalId="consolidationSources"
            >
                <VaulDrawer.Snap id="item-1" className="flex flex-col gap-4 pb-4">
                    <section className="bg-secondary-500 rounded-2xl px-4 pt-1 pb-3">
                        {withDividers([primaryRow, ...extraSources.map(extraRow)])}
                        {footer}
                    </section>
                    <SubmitButton type="button" onClick={() => setShowSheet(false)}>Done</SubmitButton>
                </VaulDrawer.Snap>
            </VaulDrawer>
        </section>
    );
};

const MoreTokensRow: FC<{ sources: ConsolidationSource[], onClick: () => void }> = ({ sources, onClick }) => {
    const summary = useConsolidationQuotes();
    const issues = sources.map(source => summary.issues[source.id]).filter(issue => !!issue?.badge);
    const usd = sources.reduce((sum, source) => {
        const row = summary.rows.find(r => r.id === source.id);
        return sum + (Number(source.amount) || 0) * (row?.priceUsd ?? source.fromAsset.price_in_usd ?? 0);
    }, 0);
    const title = `+${sources.length} more tokens`;
    const names = sources.map(source => source.fromAsset.asset).join(", ");

    return (
        <button
            type="button"
            aria-haspopup="dialog"
            data-attr="consolidation-more-tokens"
            onClick={onClick}
            className="flex items-center gap-2.5 w-full mt-1 mb-3 px-3 py-2.5 rounded-xl bg-secondary-400 hover:bg-secondary-300 text-secondary-text transition-colors duration-150"
        >
            <StackedLogos logos={sources.map(source => source.fromAsset.logo)} />
            <span className="flex-1 min-w-0 text-left">
                <span className="block text-sm leading-5 font-medium text-primary-text">{title}</span>
                <span className="block text-xs leading-4 truncate">{names}</span>
            </span>
            {
                issues.length ? <IssueBadge issue={issues[0]!} label={issues.length > 1 ? `${issues.length} issues` : undefined} />
                    : <span className="text-sm">{formatUsdValue(usd)}</span>
            }
            <ChevronRight className="w-4 h-4" />
        </button>
    );
};

const GasWarning: FC<{ shortfall: GasShortfall }> = ({ shortfall }) => {
    const symbol = shortfall.symbol ?? "gas";
    const title = `Not enough ${symbol} on ${shortfall.networkDisplayName} for gas`;
    const transfers = shortfall.transfers === 1 ? "1 transfer" : `${shortfall.transfers} transfers`;
    const detail = `${transfers} on ${shortfall.networkDisplayName} need ~${Number(shortfall.required.toPrecision(2))} ${symbol}. You have ${Number(shortfall.available.toPrecision(2))} ${symbol}.`;
    return (
        <WarningMessage className="mb-3">
            <span>
                <span>{title}</span>
                <span className="block font-normal text-secondary-text">{detail}</span>
            </span>
        </WarningMessage>
    );
};

export default MultiSourceCard;
