import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { ConsolidationRowReport, ConsolidationSummary, PRIMARY_ROW_ID, summarizeConsolidation } from "@/helpers/consolidation";

type Report = (id: string, report: ConsolidationRowReport | undefined) => void;

const ReportContext = createContext<Report | null>(null);
const RowsContext = createContext<Record<string, ConsolidationRowReport> | null>(null);

/** Collects per-source quote, gas and validation reports for the consolidation form. */
export function ConsolidationQuotesProvider({ children }: { children: ReactNode }) {
    const [rows, setRows] = useState<Record<string, ConsolidationRowReport>>({});
    const report = useCallback<Report>((id, next) => setRows(current => {
        if (!next) {
            if (!current[id]) return current;
            const { [id]: _removed, ...rest } = current;
            return rest;
        }
        return JSON.stringify(current[id]) === JSON.stringify(next) ? current : { ...current, [id]: next };
    }), []);

    return <ReportContext.Provider value={report}>
        <RowsContext.Provider value={rows}>
            {children}
        </RowsContext.Provider>
    </ReportContext.Provider>;
}

export function useReportConsolidationRow(id: string, report: ConsolidationRowReport | undefined) {
    const publish = useContext(ReportContext);
    const key = JSON.stringify(report);
    useEffect(() => {
        publish?.(id, report);
    }, [id, key, publish]);
    useEffect(() => () => publish?.(id, undefined), [id, publish]);
}

const EMPTY_ROWS: Record<string, ConsolidationRowReport> = {};

/** Inactive (single-source) unless the form holds extra sources inside a provider. */
export function useConsolidationQuotes(): ConsolidationSummary {
    const rows = useContext(RowsContext);
    const { values } = useFormikContext<SwapFormValues>();
    const extraIds = (rows ? values.extraSources ?? [] : []).map(source => source.id).join(',');
    const decimals = values.toAsset?.decimals ?? 18;
    return useMemo(() => summarizeConsolidation(
        rows ?? EMPTY_ROWS,
        [PRIMARY_ROW_ID, ...(extraIds ? extraIds.split(',') : [])],
        decimals,
    ), [rows, extraIds, decimals]);
}

export function useConsolidationRow(id: string): ConsolidationRowReport | undefined {
    return useContext(RowsContext)?.[id];
}
