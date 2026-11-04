import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { nextActiveLeg, type ConsolidationLeg, type ConsolidationRecord, type LegOutcome } from '../helpers/consolidation';

const RECORD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type PersistedConsolidations = { records: Record<string, ConsolidationRecord> };

type ConsolidationStore = PersistedConsolidations & {
    createRecord: (record: ConsolidationRecord) => void;
    setLegSwapId: (id: string, legId: string, swapId: string) => void;
    setLegAmount: (id: string, legId: string, amount: string) => void;
    markLegSubmitted: (id: string, legId: string) => void;
    cancelLeg: (id: string, legId: string) => void;
    stopRemaining: (id: string) => void;
    setActiveLeg: (id: string, legId: string | undefined) => void;
    setLegOutcome: (id: string, legId: string, outcome: LegOutcome, received?: number) => void;
    /** Sends a refunded or failed leg again as a new swap. */
    retryLeg: (id: string, legId: string) => void;
    finish: (id: string) => void;
    removeRecord: (id: string) => void;
    gc: (now: number) => void;
};

function savedRecords(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
}

const isText = (value: unknown): value is string => typeof value === 'string' && !!value.trim();

function sanitizeLeg(value: unknown): ConsolidationLeg | undefined {
    const leg = savedRecords(value);
    if (!isText(leg.id) || !isText(leg.network) || !isText(leg.token) || !isText(leg.amount)) return undefined;
    const state = leg.state === 'submitted' || leg.state === 'cancelled' ? leg.state : 'pending';
    const outcome = leg.outcome === 'delivered' || leg.outcome === 'refunded' || leg.outcome === 'failed' ? leg.outcome : undefined;
    return {
        id: leg.id, network: leg.network, token: leg.token, amount: leg.amount, state,
        ...(isText(leg.swapId) ? { swapId: leg.swapId } : {}),
        ...(outcome ? { outcome } : {}),
        ...(typeof leg.received === 'number' && Number.isFinite(leg.received) ? { received: leg.received } : {}),
        ...(typeof leg.attempt === 'number' && Number.isInteger(leg.attempt) && leg.attempt > 0 ? { attempt: leg.attempt } : {}),
    };
}

function sanitizeRecord(id: string, value: unknown): ConsolidationRecord | undefined {
    const record = savedRecords(value);
    const destination = savedRecords(record.destination);
    if (!isText(record.sourceAddress) || !isText(destination.network) || !isText(destination.token) || !isText(destination.address)) return undefined;
    if (!Array.isArray(record.legs)) return undefined;
    const legs = record.legs.map(sanitizeLeg).filter((leg): leg is ConsolidationLeg => !!leg);
    if (!legs.length || new Set(legs.map(leg => leg.id)).size !== legs.length) return undefined;
    // Records saved before the review step was removed were never confirmed.
    if (record.status !== 'executing' && record.status !== 'done') return undefined;
    const status = record.status;
    const activeLegId = isText(record.activeLegId) && legs.some(leg => leg.id === record.activeLegId && leg.state === 'pending') ? record.activeLegId : undefined;
    return {
        id,
        createdAt: typeof record.createdAt === 'number' && Number.isFinite(record.createdAt) ? record.createdAt : 0,
        status,
        sourceAddress: record.sourceAddress,
        destination: { network: destination.network, token: destination.token, address: destination.address },
        legs,
        activeLegId,
        stopped: record.stopped === true,
    };
}

export function sanitizeConsolidations(value: unknown): PersistedConsolidations {
    const records: Record<string, ConsolidationRecord> = {};
    for (const [id, record] of Object.entries(savedRecords(savedRecords(value).records))) {
        const sanitized = sanitizeRecord(id, record);
        if (sanitized) records[id] = sanitized;
    }
    return { records };
}

function updateRecord(state: PersistedConsolidations, id: string, update: (record: ConsolidationRecord) => ConsolidationRecord): Partial<PersistedConsolidations> {
    const record = state.records[id];
    if (!record) return state;
    const next = update(record);
    return next === record ? state : { records: { ...state.records, [id]: next } };
}

function updateLeg(record: ConsolidationRecord, legId: string, update: (leg: ConsolidationLeg) => ConsolidationLeg): ConsolidationRecord {
    let changed = false;
    const legs = record.legs.map(leg => {
        if (leg.id !== legId) return leg;
        const next = update(leg);
        changed ||= next !== leg;
        return next;
    });
    return changed ? { ...record, legs } : record;
}

function advance(record: ConsolidationRecord): ConsolidationRecord {
    const activeLegId = record.stopped ? undefined : nextActiveLeg(record.legs);
    return activeLegId === record.activeLegId ? record : { ...record, activeLegId };
}

export const useConsolidationStore = create<ConsolidationStore>()(
    persist<ConsolidationStore, [], [], PersistedConsolidations>(
        set => ({
            records: {},
            createRecord: record => set(state => ({ records: { ...state.records, [record.id]: record } })),
            setLegSwapId: (id, legId, swapId) => set(state => updateRecord(state, id, record =>
                updateLeg(record, legId, leg => leg.swapId === swapId ? leg : { ...leg, swapId }))),
            setLegAmount: (id, legId, amount) => set(state => updateRecord(state, id, record =>
                updateLeg(record, legId, leg => leg.amount === amount || leg.state !== 'pending' ? leg : { ...leg, amount }))),
            markLegSubmitted: (id, legId) => set(state => updateRecord(state, id, record =>
                advance(updateLeg(record, legId, leg => leg.state === 'submitted' ? leg : { ...leg, state: 'submitted' })))),
            cancelLeg: (id, legId) => set(state => updateRecord(state, id, record =>
                advance(updateLeg(record, legId, leg => leg.state !== 'pending' ? leg : { ...leg, state: 'cancelled' })))),
            // The active leg is kept when it may already have a wallet action in flight; the caller cancels it separately.
            stopRemaining: id => set(state => updateRecord(state, id, record => ({
                ...record,
                stopped: true,
                legs: record.legs.map(leg => leg.state === 'pending' && leg.id !== record.activeLegId ? { ...leg, state: 'cancelled' } : leg),
            }))),
            setActiveLeg: (id, legId) => set(state => updateRecord(state, id, record =>
                record.activeLegId === legId ? record : { ...record, activeLegId: legId })),
            setLegOutcome: (id, legId, outcome, received) => set(state => updateRecord(state, id, record =>
                updateLeg(record, legId, leg => leg.outcome === outcome && leg.received === received ? leg : { ...leg, outcome, received }))),
            retryLeg: (id, legId) => set(state => updateRecord(state, id, record => ({
                ...updateLeg(record, legId, ({ swapId: _swapId, outcome: _outcome, received: _received, ...leg }) => ({ ...leg, state: 'pending', attempt: (leg.attempt ?? 0) + 1 })),
                status: 'executing',
                stopped: false,
                activeLegId: legId,
            }))),
            finish: id => set(state => updateRecord(state, id, record => record.status === 'done' ? record : { ...record, status: 'done', activeLegId: undefined })),
            removeRecord: id => set(state => {
                if (!state.records[id]) return state;
                const { [id]: _removed, ...records } = state.records;
                return { records };
            }),
            gc: now => set(state => {
                const records = Object.fromEntries(Object.entries(state.records).filter(([, record]) =>
                    record.status !== 'done' && now - record.createdAt < RECORD_TTL_MS));
                return Object.keys(records).length === Object.keys(state.records).length ? state : { records };
            }),
        }),
        {
            name: 'consolidations',
            version: 1,
            storage: createJSONStorage(() => localStorage),
            partialize: state => sanitizeConsolidations(state),
            migrate: sanitizeConsolidations,
            merge: (persisted, current) => ({ ...current, ...sanitizeConsolidations(persisted) }),
        },
    ),
);

/** The latest started consolidation for this source address that still has legs to send. */
export function findResumable(records: Record<string, ConsolidationRecord>, address: string | undefined, equals: (a: string, b: string, network: string) => boolean): ConsolidationRecord | undefined {
    if (!address) return undefined;
    return Object.values(records)
        .filter(record => record.status === 'executing' && equals(record.sourceAddress, address, record.legs[0].network)
            && record.legs.some(leg => leg.state === 'pending') && record.legs.some(leg => leg.state === 'submitted'))
        .sort((a, b) => b.createdAt - a.createdAt)[0];
}
