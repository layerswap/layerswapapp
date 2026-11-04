import { FC, useMemo, useState } from "react";
import { Check } from "lucide-react";
import VaulDrawer from "@/components/Modal/vaulModal";
import SubmitButton from "@/components/Buttons/submitButton";
import { Address } from "@/lib/address/Address";
import { useSettingsState } from "@/context/settings";
import { useConsolidationHost } from "@/context/consolidationHost";
import { findResumable, useConsolidationStore } from "@/stores/consolidationStore";
import { ConsolidationRecord } from "@/helpers/consolidation";
import { formatAmount, formatUsdValue, StackedLogos, TokenLogo } from "./parts";

export function useResumableConsolidation(sourceAddress: string | undefined): ConsolidationRecord | undefined {
    const records = useConsolidationStore(s => s.records);
    return useMemo(() => findResumable(records, sourceAddress, (a, b, network) => Address.equals(a, b, { name: network })), [records, sourceAddress]);
}

/** Shown above the form while a multi-token send has tokens left to send. */
const ResumeCard: FC<{ sourceAddress: string | undefined }> = ({ sourceAddress }) => {
    const record = useResumableConsolidation(sourceAddress);
    const host = useConsolidationHost();
    const { networks, destinationRoutes } = useSettingsState();
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    if (!record || !host || host.openId === record.id) return null;
    const openConsolidation = host.open;

    const tokenFor = (network: string, symbol: string) => networks.find(n => n.name === network)?.tokens.find(t => t.symbol === symbol);
    const networkFor = (network: string) => networks.find(n => n.name === network);
    const unsent = record.legs.filter(leg => leg.state === "pending");
    const sent = record.legs.filter(leg => leg.state === "submitted");
    const destination = destinationRoutes.find(r => r.name === record.destination.network);
    const destinationToken = destination?.tokens.find(t => t.symbol === record.destination.token);
    const title = unsent.length === 1 ? "1 token not sent" : `${unsent.length} tokens not sent`;
    const subtitle = `${sent.length} of ${record.legs.length} sent to ${destinationToken?.asset ?? record.destination.token} on ${destination?.display_name ?? record.destination.network}`;
    const sentNote = sent.length
        ? `${sent.map(leg => `${tokenFor(leg.network, leg.token)?.asset ?? leg.token} on ${networkFor(leg.network)?.display_name ?? leg.network}`).join(", ")} ${sent.length === 1 ? "is" : "are"} already on ${sent.length === 1 ? "its" : "their"} way and ${sent.length === 1 ? "isn't" : "aren't"} affected.`
        : undefined;

    return (
        <section aria-label="Unfinished send" className="w-full mb-3 bg-secondary-500 rounded-2xl py-3.5 pr-3.5 pl-4">
            <div className="flex items-center gap-3">
                <StackedLogos logos={unsent.map(leg => tokenFor(leg.network, leg.token)?.logo)} ring="border-secondary-500" />
                <div className="flex-1 min-w-0">
                    <div className="text-base leading-5 font-medium text-primary-text">{title}</div>
                    <div className="text-sm leading-5 text-secondary-text truncate">{subtitle}</div>
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
                <SubmitButton type="button" size="small" buttonStyle="secondary" onClick={() => setConfirmDiscard(true)}>
                    Discard
                </SubmitButton>
                <SubmitButton type="button" size="small" data-ls-action="resume_consolidation" onClick={() => openConsolidation(record.id)}>
                    Continue
                </SubmitButton>
            </div>
            <VaulDrawer
                show={confirmDiscard}
                setShow={setConfirmDiscard}
                header={
                    <span className="flex flex-col">
                        <span className="text-xl leading-7 font-semibold text-primary-text">Discard unsent tokens?</span>
                        <span className="text-sm leading-5 font-normal text-secondary-text">These won't be sent:</span>
                    </span>
                }
                modalId="discardConsolidation"
            >
                <VaulDrawer.Snap id="item-1" className="pb-6 flex flex-col gap-3.5">
                    <section className="bg-secondary-500 rounded-2xl p-1.5">
                        {unsent.map(leg => {
                            const token = tokenFor(leg.network, leg.token);
                            const network = networkFor(leg.network);
                            return (
                                <div key={leg.id} className="flex items-center gap-3 p-2.5">
                                    <TokenLogo tokenLogo={token?.logo} networkLogo={network?.logo} size={32} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-base leading-6 font-medium text-primary-text">{token?.asset ?? leg.token}</div>
                                        <div className="text-xs leading-4 text-secondary-text">{network?.display_name ?? leg.network}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-base leading-6 text-primary-text">{formatAmount(leg.amount)}</div>
                                        <div className="text-xs leading-4 text-secondary-text">{formatUsdValue((Number(leg.amount) || 0) * (token?.price_in_usd ?? 0))}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                    {
                        sentNote ? (
                            <div className="flex items-start gap-2 text-sm leading-5 text-secondary-text">
                                <Check className="w-4 h-4 shrink-0" />
                                <span>{sentNote}</span>
                            </div>
                        ) : null
                    }
                    <div className="flex flex-col gap-2 mt-1">
                        <SubmitButton type="button" onClick={() => { setConfirmDiscard(false); openConsolidation(record.id); }}>
                            Continue sending
                        </SubmitButton>
<SubmitButton type="button" buttonStyle="secondary" onClick={() => { useConsolidationStore.getState().finish(record.id); setConfirmDiscard(false); }}>
                            <span className="text-error-foreground">Discard</span>
                        </SubmitButton>
                    </div>
                </VaulDrawer.Snap>
            </VaulDrawer>
        </section>
    );
};

export default ResumeCard;
