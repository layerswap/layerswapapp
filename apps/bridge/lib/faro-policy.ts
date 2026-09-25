import { LogLevel, TransportItemType, type EventEvent, type TraceEvent, type TransportItem } from '@grafana/faro-web-sdk'

/** Build mode controls verbosity, not deployment identity or API network. */
export function getFaroVolumePolicy(nodeEnv: string | undefined) {
    const deployedBuild = nodeEnv === 'production'
    return {
        dedupe: true,
        trackResources: !deployedBuild,
        consoleInstrumentation: {
            // Deployed builds keep console errors only; third-party libraries warn on every page.
            disabledLevels: deployedBuild ? [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG, LogLevel.INFO, LogLevel.WARN] : [],
            consoleErrorAsLog: false,
            serializeErrors: true,
        },
    }
}

type OtlpAttribute = { key: string; value: Record<string, unknown> }

const TRACING_EVENT_PREFIX = 'faro.tracing.'
const URL_KEYS = ['url.full', 'http.url']
const STATUS_KEYS = ['http.response.status_code', 'http.status_code']
const OTLP_STATUS_ERROR = 2

function toOrigin(url: string | undefined): string | undefined {
    if (!url) return undefined
    try { return new URL(url).origin }
    catch { return undefined }
}

/** Status 0 (blocked, aborted, offline) and a missing status are failures too. */
function isFailedStatus(status: unknown): boolean {
    const code = Number(status)
    return !Number.isFinite(code) || code === 0 || code >= 400
}

/**
 * Request spans are reported only when a first-party request failed: third-party
 * RPC and analytics calls are covered by widget operations and diagnostics, and
 * successful requests carry no signal worth their volume. The filter applies to
 * both `faro.tracing.*` events (Loki) and OTLP trace items (Tempo).
 */
export function createRequestTelemetryFilter(firstPartyUrls: (string | undefined)[]) {
    const firstPartyOrigins = new Set(firstPartyUrls.map(toOrigin).filter((origin): origin is string => !!origin))
    const shouldReport = (url: string | undefined, status: unknown) => {
        const origin = toOrigin(url)
        return !!origin && firstPartyOrigins.has(origin) && isFailedStatus(status)
    }

    const filterTraces = (payload: TraceEvent): TraceEvent | null => {
        const resourceSpans = (payload.resourceSpans ?? []).map(resourceSpan => ({
            ...resourceSpan,
            scopeSpans: resourceSpan.scopeSpans.map(scopeSpan => ({
                ...scopeSpan,
                spans: scopeSpan.spans?.filter(span => {
                    const attributes = span.attributes as OtlpAttribute[]
                    const read = (keys: string[]) => {
                        const attribute = attributes.find(({ key }) => keys.includes(key))
                        return attribute ? Object.values(attribute.value)[0] : undefined
                    }
                    const url = read(URL_KEYS)
                    // Spans that are not requests (e.g. user actions) are kept as they are.
                    if (url === undefined) return true
                    return shouldReport(String(url), span.status?.code === OTLP_STATUS_ERROR ? 0 : read(STATUS_KEYS))
                }),
            })).filter(scopeSpan => scopeSpan.spans?.length),
        })).filter(resourceSpan => resourceSpan.scopeSpans.length)
        return resourceSpans.length ? { ...payload, resourceSpans } : null
    }

    return (item: TransportItem): TransportItem | null => {
        if (item.type === TransportItemType.TRACE) {
            const payload = filterTraces(item.payload as TraceEvent)
            return payload ? { ...item, payload } : null
        }
        if (item.type === TransportItemType.EVENT) {
            const { name, attributes = {} } = item.payload as EventEvent
            if (!name.startsWith(TRACING_EVENT_PREFIX)) return item
            const url = URL_KEYS.map(key => attributes[key]).find(Boolean)
            const status = STATUS_KEYS.map(key => attributes[key]).find(value => value !== undefined)
            return shouldReport(url, status) ? item : null
        }
        return item
    }
}

/** Successful balance reads are a third of all events; failures and partial reads are kept. */
export function shouldCaptureWidgetTelemetry(event: { name: string; attributes: Record<string, unknown> }): boolean {
    return !(event.name === 'widget_operation'
        && event.attributes.operation === 'balance_fetch'
        && event.attributes.outcome === 'succeeded')
}
