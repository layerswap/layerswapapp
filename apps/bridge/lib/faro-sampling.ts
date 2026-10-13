import type { Config, MetaSession } from '@grafana/faro-web-sdk'

// SamplingContext is declared in faro-core config/types.d.ts but not re-exported
// from the SDK index; derive it from the config type instead.
type SessionTracking = NonNullable<Config['sessionTracking']>
type Sampler = NonNullable<SessionTracking['sampler']>
type SamplingContext = Parameters<Sampler>[0]

/** Shape of `PersistentSessionsManager.fetchUserSession()` (faro-web-sdk FaroUserSession). */
export type StoredSession = { sessionId: string; isSampled: boolean } | null | undefined

export function parseSamplingRate(value: string | undefined): number {
    if (!value) return 1

    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 1

    return Math.min(1, Math.max(0, parsed))
}

/**
 * Binds the sampling decision to the session id. Faro 2.11.0 re-evaluates
 * isSampled() on every session-attribute change (sessionManagerUtils.js:70-75),
 * so without this an app context write would re-roll the session. Result:
 * one roll per page-load chain, inherited across in-page rotation, never
 * re-rolled by context writes.
 *
 * Order matters: the stored decision wins first (writers that omit `isSampled`
 * from attributes cannot cause a roll), the in-memory attribute second, and
 * `rate` (a number, which the SDK prefers over `samplingRate`) last.
 */
export function createSessionSampler(rate: number, fetchStored: () => StoredSession): Sampler {
    return ({ metas }: SamplingContext) => {
        const live: MetaSession | undefined = metas?.session
        // createInitialSession fresh path: no live session yet, roll once.
        if (!live?.id) return rate

        let stored: StoredSession
        try { stored = fetchStored() }
        catch { stored = undefined }
        if (stored?.sessionId === live.id && typeof stored.isSampled === 'boolean') return stored.isSampled ? 1 : 0

        // Storage-less fallback: keep whatever decision the live session carries.
        const inMemory = live.attributes?.isSampled
        if (inMemory === 'true') return 1
        if (inMemory === 'false') return 0
        return rate
    }
}

export function getSessionTrackingConfig(rawRate: string | undefined, fetchStored: () => StoredSession): SessionTracking {
    const samplingRate = parseSamplingRate(rawRate)
    return { enabled: true, persistent: true, samplingRate, sampler: createSessionSampler(samplingRate, fetchStored) }
}
