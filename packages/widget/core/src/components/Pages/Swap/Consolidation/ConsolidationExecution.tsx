import { FC, useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowDown, Check } from "lucide-react";
import SubmitButton from "@/components/Buttons/submitButton";
import WarningMessage from "@/components/Common/WarningMessage";
import { Widget } from "@/components/Widget/Index";
import { Page2Contained } from "../Withdraw/Presentation/Page2Contained";
import { Partner } from "@/Models/Partner";
import { Address } from "@/lib/address/Address";
import { addDecimal } from "@/lib/extendedRoutes/amounts";
import { useSettingsState } from "@/context/settings";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useNamedAddress } from "@/stores/addressBookStore";
import { ConsolidationDestination, ConsolidationRecord, isRecordFinished, nextActiveLeg, rehydrateLeg } from "@/helpers/consolidation";
import { useConsolidationStore } from "@/stores/consolidationStore";
import LegStep, { LegReport } from "./LegStep";

import { formatAmount, formatUsdValue, TokenLogo } from "./parts";

type Props = {
    recordId: string;
    partner?: Partner;
    onClose: () => void;
};


/** Sends one token at a time; the footer is always the current token's wallet button. */
const ConsolidationExecution: FC<Props> = ({ recordId, partner, onClose }) => {
    const record = useConsolidationStore(s => s.records[recordId]);
    const { sourceRoutes, destinationRoutes, networks } = useSettingsState();
    const [reports, setReports] = useState<Record<string, LegReport>>({});
    const [footerSlot, setFooterSlot] = useState<HTMLDivElement | null>(null);
    const [quoteSlot, setQuoteSlot] = useState<HTMLDivElement | null>(null);
    const onReport = useCallback((legId: string, report: LegReport) => setReports(current => ({ ...current, [legId]: report })), []);

    const destination = useMemo<ConsolidationDestination | undefined>(() => {
        if (!record) return undefined;
        const to = destinationRoutes.find(route => route.name === record.destination.network);
        const toAsset = to?.tokens.find(token => token.symbol === record.destination.token);
        return to && toAsset ? { to, toAsset, destination_address: record.destination.address } : undefined;
    }, [destinationRoutes, record?.destination]);
    const legRoutes = useMemo(() => Object.fromEntries((record?.legs ?? []).map(leg => {
        const route = rehydrateLeg(leg, sourceRoutes);
        // Route tokens can be compacted; the network list always carries display metadata.
        const networkToken = networks.find(n => n.name === leg.network)?.tokens.find(t => t.symbol === leg.token);
        return [leg.id, route && { ...route, fromAsset: { ...networkToken, ...route.fromAsset, logo: route.fromAsset.logo || networkToken?.logo || "" } }];
    })), [record?.legs, sourceRoutes, networks]);

    const sourceNetwork = record?.legs[0].network;
    const account = useSelectedAccount("from", sourceNetwork);
    const accountMatches = !!record && !!account?.address && Address.equals(account.address, record.sourceAddress, { name: record.legs[0].network });
    const sourceNetworkRoute = record ? legRoutes[record.legs[0].id]?.from ?? { name: record.legs[0].network } : undefined;
    const sourceAddressText = useNamedAddress(record?.sourceAddress, sourceNetworkRoute);
    const connectedAddressText = useNamedAddress(account?.address, sourceNetworkRoute);

    // A leg whose route disappeared before it was created cannot run; skip it so the queue moves on.
    useEffect(() => {
        if (!record) return;
        const store = useConsolidationStore.getState();
        const active = record.legs.find(leg => leg.id === record.activeLegId);
        if (active && !active.swapId && !(legRoutes[active.id] && destination)) {
            store.cancelLeg(record.id, active.id);
            return;
        }
        if (!record.activeLegId && !record.stopped) {
            const next = nextActiveLeg(record.legs);
            if (next) store.setActiveLeg(record.id, next);
        }
    }, [record?.activeLegId, record?.stopped, record?.legs, legRoutes, destination]);

    if (!record) return null;

    const legs = record.legs.filter(leg => leg.state !== "cancelled");
    const allSent = isRecordFinished(record);
    const finished = allSent && legs.every(leg => !!leg.outcome || reports[leg.id]?.status === "delivered" || reports[leg.id]?.status === "refunded" || reports[leg.id]?.status === "failed");
    const allDelivered = finished && legs.length > 0 && legs.every(leg => (reports[leg.id]?.status ?? leg.outcome) === "delivered");
    const legList = record.legs.map(leg => (
        <LegStep
            key={`${leg.id}:${leg.attempt ?? 0}`}
            recordId={record.id}
            leg={leg}
            route={legRoutes[leg.id]}
            destination={destination}
            active={record.activeLegId === leg.id}
            canExecute={accountMatches}
            footerSlot={footerSlot}
            quoteSlot={quoteSlot}
            canRetry={allSent}
            partner={partner}
            onReport={onReport}
        />
    ));

    return (
        <Page2Contained>
            <div className="flex flex-col gap-2">
            {
                !accountMatches && !allSent ? (
                    <WarningMessage>
                        <span>
                            <span>{`Wrong account connected. Switch back to ${sourceAddressText} in your wallet to keep sending.`}</span>
                            {account?.address ? <span className="block font-normal text-secondary-text">{`Connected now: ${connectedAddressText}`}</span> : null}
                        </span>
                    </WarningMessage>
                ) : null
            }
            {allDelivered && destination ? <FinishedHero record={record} destination={destination} reports={reports} /> : null}
            <section className="bg-secondary-500 rounded-2xl p-2">
                {!allSent ? <div className="px-2.5 pt-1.5 pb-1 text-xs leading-4 text-secondary-text">Sending in this order</div> : null}
                {legList}
                {allDelivered ? <div className="px-2.5 pb-2.5"><ProgressBar record={record} reports={reports} /></div> : null}
            </section>
            {
                !allDelivered && destination ? (
                    <div className="relative">
                        <span className="absolute z-10 left-1/2 -translate-x-1/2 -top-5 w-8 h-8 rounded-lg border-4 border-secondary-700 bg-secondary-300 text-secondary-text flex items-center justify-center">
                            <ArrowDown className="w-3.5 h-3.5" />
                        </span>
                        <DestinationProgress record={record} destination={destination} reports={reports} finished={finished} />
                    </div>
                ) : null
            }
            <div ref={setQuoteSlot} className="empty:hidden" />
            </div>
            <Widget.Footer sticky={false}>
                {
                    allSent ? (
                        <SubmitButton type="button" onClick={onClose}>Done</SubmitButton>
                    ) : accountMatches ? (
                        <div ref={setFooterSlot} className="empty:hidden" />
                    ) : (
                        <SubmitButton type="button" isDisabled>{`Switch to ${sourceAddressText}`}</SubmitButton>
                    )
                }
            </Widget.Footer>
        </Page2Contained>
    );
};

type ProgressProps = { record: ConsolidationRecord, reports: Record<string, LegReport> };

const segmentColor = (status: LegReport["status"] | undefined) => {
    switch (status) {
        case "delivered": return "bg-success-foreground";
        case "submitted": return "bg-primary";
        case "refunded":
        case "failed": return "bg-warning-foreground";
        default: return "bg-secondary-300";
    }
};

/** One segment per token, sized by its expected amount. */
const ProgressBar: FC<ProgressProps> = ({ record, reports }) => {
    const legs = record.legs.filter(leg => leg.state !== "cancelled");
    return (
        <div className="flex gap-1 w-full" aria-hidden="true">
            {legs.map(leg => {
                const report = reports[leg.id];
                const weight = report?.outputAmount ?? report?.expectedReceive ?? Number(leg.amount) ?? 1;
                return <span key={leg.id} className={clsx("h-1.5 rounded-sm transition-colors duration-300", segmentColor(report?.status ?? leg.outcome))} style={{ flexGrow: Math.max(weight, 0.0001), flexBasis: 0 }} />;
            })}
        </div>
    );
};

const sumDecimals = (values: (number | undefined)[], decimals: number) => Number(values.reduce<string>((sum, value) => addDecimal(sum, value ?? 0, decimals), "0"));

const DestinationProgress: FC<ProgressProps & { destination: ConsolidationDestination, finished: boolean }> = ({ record, destination, reports, finished }) => {
    const { to, toAsset } = destination;
    const destinationAddressText = useNamedAddress(record.destination.address, to);
    const decimals = toAsset.decimals ?? 18;
    const legs = record.legs.filter(leg => leg.state !== "cancelled");
    const statusOf = (legId: string) => reports[legId]?.status ?? record.legs.find(leg => leg.id === legId)?.outcome;
    const counted = legs.filter(leg => statusOf(leg.id) !== "refunded" && statusOf(leg.id) !== "failed");
    const received = sumDecimals(legs.map(leg => statusOf(leg.id) === "delivered" ? reports[leg.id]?.outputAmount ?? leg.received : 0), decimals);
    const expected = sumDecimals(counted.map(leg => reports[leg.id]?.outputAmount ?? reports[leg.id]?.expectedReceive), decimals);
    const refunded = legs.length - counted.length;
    const total = finished ? `${formatAmount(received)}` : `≈ ${formatAmount(expected)}`;
    const usd = formatUsdValue((finished ? received : expected) * (toAsset.price_in_usd ?? 0));
    const receivedText = finished && refunded ? `${formatAmount(received)}` : `${formatAmount(received)} of ≈ ${formatAmount(expected)}`;
    const refundedText = `${refunded} refunded`;

    return (
        <section className="bg-secondary-500 rounded-2xl p-2">
            <div className="flex flex-col gap-2 p-2.5">
            <div className="flex items-center gap-3">
                <TokenLogo tokenLogo={toAsset.logo} networkLogo={to.logo} size={32} />
                <div className="flex-1 min-w-0">
                    <div className="text-base leading-6 font-medium text-primary-text">{toAsset.asset}</div>
                    <div className="text-xs leading-4 text-secondary-text truncate">
                        <span>{`${to.display_name} · `}</span>
                        <span>{destinationAddressText}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-base leading-6 text-primary-text">{total}</div>
                    <div className="text-xs leading-4 text-secondary-text">{usd}</div>
                </div>
            </div>
            <ProgressBar record={record} reports={reports} />
            <div className="flex justify-between text-xs leading-4">
                <span className="text-secondary-text">Received</span>
                <span className="text-primary-text">
                    <span>{receivedText}</span>
                    {refunded ? <span>{" "}<span className="text-secondary-text">·</span>{" "}<span className="text-warning-foreground">{refundedText}</span></span> : null}
                </span>
            </div>
            </div>
        </section>
    );
};

const FinishedHero: FC<ProgressProps & { destination: ConsolidationDestination }> = ({ record, destination, reports }) => {
    const { to, toAsset } = destination;
    const destinationAddressText = useNamedAddress(record.destination.address, to);
    const received = sumDecimals(record.legs.map(leg => reports[leg.id]?.outputAmount ?? leg.received), toAsset.decimals ?? 18);
    const count = record.legs.filter(leg => leg.state !== "cancelled").length;
    return (
        <div className="flex flex-col items-center text-center gap-2 py-4">
            <div className="w-14 h-14 rounded-full bg-success-background text-success-foreground flex items-center justify-center">
                <Check className="w-7 h-7" strokeWidth={2} />
            </div>
            <h2 className="m-0 text-2xl leading-8 font-semibold tracking-tight text-primary-text">{`${formatAmount(received)} ${toAsset.asset} received`}</h2>
            <div className="text-sm leading-5 text-secondary-text">
                <span>{`On ${to.display_name}, from ${count} tokens · `}</span>
                <span>{destinationAddressText}</span>
            </div>
        </div>
    );
};

export default ConsolidationExecution;
