import { FC } from "react";
import { useConsolidationStore } from "@/stores/consolidationStore";
import { ConsolidationRecord } from "@/helpers/consolidation";

const subtitle = (record: ConsolidationRecord) => {
    const legs = record.legs.filter(leg => leg.state !== "cancelled");
    if (record.legs.some(leg => leg.state === "pending")) {
        const started = record.legs.some(leg => leg.state !== "pending");
        const position = Math.max(record.legs.findIndex(leg => leg.id === record.activeLegId) + 1, 1);
        return started ? `Confirmation ${position} of ${record.legs.length}` : `${record.legs.length} wallet confirmations, one per token`;
    }
    const refunded = legs.filter(leg => leg.outcome === "refunded" || leg.outcome === "failed").length;
    if (legs.every(leg => leg.outcome)) return refunded ? `Finished · ${refunded} refunded` : undefined;
    const skipped = record.legs.length - legs.length;
    return skipped ? `${legs.length} sent · ${skipped} not sent` : `All ${legs.length} sent`;
};

/** Drawer title with progress through the wallet confirmations; empty once everything arrived (the sheet shows a success header). */
const ConsolidationSheetHeader: FC<{ recordId: string }> = ({ recordId }) => {
    const record = useConsolidationStore(s => s.records[recordId]);
    if (!record) return null;
    const legs = record.legs.filter(leg => leg.state !== "cancelled");
    if (legs.length && legs.every(leg => leg.state === "submitted" && leg.outcome === "delivered")) return null;
    const text = subtitle(record);
    return (
        <span className="flex flex-col">
            <span className="text-xl leading-7 font-semibold text-primary-text">Complete the swap</span>
            {text ? <span className="text-sm leading-5 font-normal text-secondary-text">{text}</span> : null}
        </span>
    );
};

export default ConsolidationSheetHeader;
