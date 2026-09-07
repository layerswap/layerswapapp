import { ReactIntegration } from '@grafana/faro-react'
import {
    getInternalFaroFromGlobalObject,
    getWebInstrumentations,
    initializeFaro,
    InternalLoggerLevel,
    TransportItemType,
    type APIEvent,
    type Faro,
    type Meta,
    type TransportItem,
} from '@grafana/faro-web-sdk'
import { TracingInstrumentation } from '@grafana/faro-web-tracing'

// Keep this identity aligned with the existing Grafana app configured by the
// babkenmes/posthog-to-faro branch.
const FARO_APP_NAME = 'layerswap-frontend'
const REDACTED = '[REDACTED]'
const MAX_CONTEXT_VALUE_LENGTH = 8_192

let faroClient: Faro | undefined
let initializationAttempted = false

const normalizedSensitiveKeys = [
    'authorization',
    'cookie',
    'setcookie',
    'apikey',
    'accesstoken',
    'refreshtoken',
    'idtoken',
    'password',
    'passphrase',
    'privatekey',
    'clientsecret',
    'mnemonic',
    'seedphrase',
    'bearertoken',
    'signature',
]

function isSensitiveKey(key: string): boolean {
    const normalizedKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase()
    return normalizedSensitiveKeys.some(sensitiveKey => normalizedKey.includes(sensitiveKey))
}

function redactSensitiveText(value: string): string {
    return value
        .replace(/(bearer\s+)[a-z0-9._~+/=-]+/gi, `$1${REDACTED}`)
        .replace(
            /([?&](?:api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|password|passphrase|private[_-]?key|client[_-]?secret|mnemonic|seed[_-]?phrase|signature)=)[^&#\s]*/gi,
            `$1${REDACTED}`,
        )
        .replace(
            /((?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|password|passphrase|private[_-]?key|client[_-]?secret|mnemonic|seed[_-]?phrase|signature)["']?\s*[:=]\s*["']?)[^,"'\s}]+/gi,
            `$1${REDACTED}`,
        )
}

function sanitizeValue(
    value: unknown,
    key = '',
    seen = new WeakSet<object>(),
    depth = 0,
): unknown {
    if (isSensitiveKey(key)) return REDACTED
    if (typeof value === 'string') {
        const sanitized = redactSensitiveText(value)
        return sanitized.length > MAX_CONTEXT_VALUE_LENGTH
            ? `${sanitized.slice(0, MAX_CONTEXT_VALUE_LENGTH)}...[truncated]`
            : sanitized
    }
    if (typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function') {
        return String(value)
    }
    if (value === null || value === undefined || typeof value !== 'object') return value
    if (depth >= 8) return '[Maximum depth reached]'
    if (seen.has(value)) return '[Circular]'

    seen.add(value)

    if (value instanceof Error) {
        return {
            name: value.name,
            message: redactSensitiveText(value.message),
            stack: value.stack ? redactSensitiveText(value.stack) : undefined,
        }
    }

    if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item, key, seen, depth + 1))
    }

    return Object.fromEntries(
        Object.entries(value).map(([nestedKey, nestedValue]) => [
            nestedKey,
            sanitizeValue(nestedValue, nestedKey, seen, depth + 1),
        ]),
    )
}

function beforeSend(item: TransportItem): TransportItem | null {
    if (
        item.type === TransportItemType.EXCEPTION
        && 'value' in item.payload
        && typeof item.payload.value === 'string'
        && item.payload.value.includes('ResizeObserver loop')
    ) {
        return null
    }

    return {
        ...item,
        payload: sanitizeValue(item.payload) as APIEvent,
        meta: sanitizeValue(item.meta) as Meta,
    }
}

function parseSamplingRate(value: string | undefined): number {
    if (!value) return 1

    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 1

    return Math.min(1, Math.max(0, parsed))
}

function getTracePropagationUrls(): RegExp[] | undefined {
    const configuredUrls = process.env.NEXT_PUBLIC_FARO_TRACE_PROPAGATION_URLS
        ?.split(',')
        .map(url => url.trim())
        .filter(Boolean)

    return configuredUrls?.length
        ? configuredUrls.map(url => {
            const prefix = url.replace(/\/+$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            return new RegExp(`^${prefix}(?:/|$)`)
        })
        : undefined
}

/**
 * Initializes browser observability once. This is intentionally called from
 * `instrumentation-client.ts`, before the application hydrates, so startup
 * errors and console output are captured too.
 */
export function initFaro(): Faro | undefined {
    if (typeof window === 'undefined') return undefined
    if (faroClient) return faroClient

    const existingClient = getInternalFaroFromGlobalObject()
    if (existingClient) {
        faroClient = existingClient
        return faroClient
    }

    if (initializationAttempted) return undefined
    initializationAttempted = true

    const collectorUrl = process.env.NEXT_PUBLIC_FARO_COLLECTOR_URL
    if (!collectorUrl) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[Faro] NEXT_PUBLIC_FARO_COLLECTOR_URL is not set; browser telemetry is disabled.')
        }
        return undefined
    }

    const tracePropagationUrls = getTracePropagationUrls()

    try {
        faroClient = initializeFaro({
            url: collectorUrl,
            app: {
                name: FARO_APP_NAME,
                version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'local',
                environment: process.env.NEXT_PUBLIC_API_VERSION || 'sandbox',
            },
            beforeSend,
            // Repeated identical logs can be meaningful in swap diagnostics.
            dedupe: false,
            consoleInstrumentation: {
                // Faro disables debug, trace, and log by default. An empty list
                // explicitly captures every browser console level.
                disabledLevels: [],
                consoleErrorAsLog: false,
                serializeErrors: true,
            },
            internalLoggerLevel: process.env.NEXT_PUBLIC_FARO_DEBUG === 'true'
                ? InternalLoggerLevel.VERBOSE
                : InternalLoggerLevel.ERROR,
            pageTracking: {
                generatePageId: location => location.pathname,
            },
            sessionTracking: {
                enabled: true,
                persistent: true,
                samplingRate: parseSamplingRate(process.env.NEXT_PUBLIC_FARO_SAMPLE_RATE),
            },
            trackResources: true,
            experimental: {
                trackNavigation: true,
            },
            instrumentations: [
                ...getWebInstrumentations({
                    captureConsole: true,
                    enableContentSecurityPolicyInstrumentation: true,
                    enablePerformanceInstrumentation: true,
                }),
                new ReactIntegration(),
                new TracingInstrumentation({
                    instrumentationOptions: tracePropagationUrls
                        ? { propagateTraceHeaderCorsUrls: tracePropagationUrls }
                        : undefined,
                    omitTraceContextForUnsampledSessions: true,
                }),
            ],
        })

        if (process.env.NEXT_PUBLIC_FARO_DEBUG === 'true') {
            faroClient?.unpatchedConsole.info('[Faro] Browser telemetry initialized.')
        }
    }
    catch (error) {
        // Observability must never prevent the application from starting.
        console.error('[Faro] Browser telemetry initialization failed.', error)
    }

    return faroClient
}

export function getFaro(): Faro | undefined {
    return faroClient ?? getInternalFaroFromGlobalObject()
}

function flattenContext(
    value: Record<string, unknown>,
    prefix = '',
    result: Record<string, string> = {},
    seen = new WeakSet<object>(),
): Record<string, string> {
    if (seen.has(value)) {
        if (prefix) result[prefix] = '[Circular]'
        return result
    }

    seen.add(value)

    for (const [key, rawValue] of Object.entries(value)) {
        if (rawValue === undefined || rawValue === null) continue

        const outputKey = prefix ? `${prefix}.${key}` : key
        const sanitizedValue = sanitizeValue(rawValue, key)

        if (
            sanitizedValue !== null
            && !Array.isArray(sanitizedValue)
            && typeof sanitizedValue === 'object'
        ) {
            flattenContext(sanitizedValue as Record<string, unknown>, outputKey, result, seen)
            continue
        }

        const serialized = typeof sanitizedValue === 'string'
            ? sanitizedValue
            : JSON.stringify(sanitizedValue)

        if (serialized !== undefined) {
            result[outputKey] = serialized.length > MAX_CONTEXT_VALUE_LENGTH
                ? `${serialized.slice(0, MAX_CONTEXT_VALUE_LENGTH)}...[truncated]`
                : serialized
        }
    }

    return result
}

/** Returns true when the exception was accepted by Faro. */
export function captureException(error: unknown, context?: Record<string, unknown>): boolean {
    const client = getFaro() ?? initFaro()
    if (!client) return false

    try {
        client.api.pushError(error instanceof Error ? error : new Error(String(error)), {
            context: context ? flattenContext(context) : undefined,
        })
        return true
    }
    catch (captureError) {
        client.unpatchedConsole.error('[Faro] Failed to capture exception.', captureError)
        return false
    }
}

/** Sends a structured business event using the field layout expected by the Faro dashboards. */
export function captureEvent(name: string, attributes?: Record<string, unknown>): boolean {
    const client = getFaro() ?? initFaro()
    if (!client) return false

    try {
        client.api.pushEvent(name, attributes ? flattenContext(attributes) : undefined)
        return true
    }
    catch (captureError) {
        client.unpatchedConsole.error(`[Faro] Failed to capture event "${name}".`, captureError)
        return false
    }
}

/** Adds the active swap to every subsequent Faro signal without rotating its session ID. */
export function setSwapContext(
    attributes: Record<string, unknown>,
    options: { replaceAttributes?: boolean } = {},
): boolean {
    const client = getFaro() ?? initFaro()
    if (!client) return false

    try {
        const currentSession = client.api.getSession()
        if (!currentSession?.id) return false

        client.api.setSession({
            ...currentSession,
            attributes: options.replaceAttributes ? flattenContext(attributes) : {
                ...currentSession.attributes,
                ...flattenContext(attributes),
            },
        })
        return true
    }
    catch (captureError) {
        client.unpatchedConsole.error('[Faro] Failed to set swap session context.', captureError)
        return false
    }
}

export function setFaroView(name: string): void {
    const client = getFaro() ?? initFaro()
    if (!client) return

    client.api.setView({ name })
}
