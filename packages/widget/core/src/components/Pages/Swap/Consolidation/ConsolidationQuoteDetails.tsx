import { FC, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useFormikContext } from "formik";
import VaulDrawer from "@/components/Modal/vaulModal";
import SubmitButton from "@/components/Buttons/submitButton";
import AverageCompletionTime from "@/components/Common/AverageCompletionTime";
import { ManualQuoteView } from "../Withdraw/Presentation/ManualQuoteView";
import { QuoteDetailsSummary } from "../Withdraw/Presentation/QuoteDetailsSummary";
import { RowWrapper } from "../Withdraw/Presentation/QuoteEstimateRows";
import SwapQuoteComp from "../Form/FeeDetails/SwapQuote";
import { ConsolidationRowReport, ConsolidationSummary } from "@/helpers/consolidation";
import { hmsToMs } from "@/components/utils/formatTime";
import { useSelectedAccount } from "@/context/swapAccounts";
import { SwapFormValues } from "../Form/SwapFormValues";
import { formatUsdValue, StackedLogos } from "./parts";

export const formatMinutes = (avgCompletionTime: string | undefined) => {
    const ms = hmsToMs(avgCompletionTime);
    return ms == null ? undefined : `~${Math.max(1, Math.round(ms / 60000))} min`;
};

export const slowestTime = (rows: Pick<ConsolidationRowReport, 'avgCompletionTime'>[]) => rows.reduce<string | undefined>((slowest, row) =>
    (hmsToMs(row.avgCompletionTime) ?? 0) > (hmsToMs(slowest) ?? 0) ? row.avgCompletionTime : slowest, undefined);

type Props = { summary: ConsolidationSummary };

/** The form's quote accordion with combined totals; each token's own quote opens in a sheet. */
const ConsolidationQuoteDetails: FC<Props> = ({ summary }) => {
    const { values } = useFormikContext<SwapFormValues>();
    const [open, setOpen] = useState(false);
    const [showByToken, setShowByToken] = useState(false);
    const { rows, validRows, totals, isLoading } = summary;
    const transfers = `${validRows.length} ${validRows.length === 1 ? "transfer" : "transfers"}`;
    const time = slowestTime(validRows);
    const description = `${transfers} into ${values.toAsset?.asset ?? ""} on ${values.to?.display_name ?? ""}`;

    return (
        <>
            <ManualQuoteView
                available={validRows.length > 0}
                isAccordionOpen={open}
                setIsAccordionOpen={setOpen}
                isQuoteLoading={isLoading}
                triggerClassnames="mt-2"
                detailsButton={
                    <span className="flex items-center gap-3 text-sm">
                        <QuoteDetailsSummary gasFeeInUsd={totals.gasUsd || null} isQuoteLoading={isLoading} averageCompletionTime={time} />
                        <span className="text-primary-text">{transfers}</span>
                    </span>
                }
                details={
                    <div className="flex flex-col px-2 pb-2">
                        <RowWrapper title="Fees"><span>{formatUsdValue(totals.feesUsd)}</span></RowWrapper>
                        <RowWrapper title="Gas"><span>{formatUsdValue(totals.gasUsd)}</span></RowWrapper>
                        {time ? <RowWrapper title="Estimated time per transfer"><AverageCompletionTime avgCompletionTime={time} /></RowWrapper> : null}
                        <RowWrapper title="Wallet confirmations"><span>{validRows.length}</span></RowWrapper>
                        <button
                            type="button"
                            aria-haspopup="dialog"
                            onClick={() => setShowByToken(true)}
                            className="flex items-center gap-2 w-full px-2 py-3 rounded-xl text-sm text-primary-text hover:bg-secondary-300 transition-colors duration-150"
                        >
                            <StackedLogos logos={rows.map(row => logoFor(values, row.id))} />
                            <span className="flex-1 text-left">Quote by token</span>
                            <ChevronRight className="w-4 h-4 text-secondary-text" />
                        </button>
                    </div>
                }
            />
            <VaulDrawer show={showByToken} setShow={setShowByToken} header="Quote by token" description={description} modalId="consolidationQuoteByToken">
                <VaulDrawer.Snap id="item-1" className="flex flex-col gap-2 pb-4">
                    {validRows.map(row => <TokenQuote key={row.id} row={row} />)}
                    <SubmitButton type="button" onClick={() => setShowByToken(false)}>Done</SubmitButton>
                </VaulDrawer.Snap>
            </VaulDrawer>
        </>
    );
};

/** One token's quote, shown with the same component a single swap uses. */
const TokenQuote: FC<{ row: ConsolidationRowReport }> = ({ row }) => {
    const { values } = useFormikContext<SwapFormValues>();
    const source = values.extraSources?.find(s => s.id === row.id);
    const from = source?.from ?? values.from;
    const fromAsset = source?.fromAsset ?? values.fromAsset;
    const account = useSelectedAccount("from", from?.name);
    if (!row.quote || !from || !fromAsset) return null;
    return (
        <SwapQuoteComp
            quote={{ quote: row.quote }}
            swapValues={{ ...values, from, fromAsset, amount: row.amount, refuel: false, extraSources: undefined }}
            sourceAddress={account?.address}
        />
    );
};

const logoFor = (values: SwapFormValues, id: string) =>
    values.extraSources?.find(source => source.id === id)?.fromAsset.logo ?? values.fromAsset?.logo;

export default ConsolidationQuoteDetails;
