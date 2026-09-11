import { ReactIntegration } from '@grafana/faro-react'
import {
    getInternalFaroFromGlobalObject,
    getWebInstrumentations,
    initializeFaro,
    InternalLoggerLevel,
    type Faro,
} from '@grafana/faro-web-sdk'
import { TracingInstrumentation } from '@grafana/faro-web-tracing'
import { beforeSend, MAX_CONTEXT_VALUE_LENGTH, sanitizeValue } from './faro-sanitizer'
import { createWalletContextWriter, createSwapContextWriter, SwapContextInstrumentation } from './faro-session-context'
import { getFaroVolumePolicy } from './faro-policy'

// Keep this identity aligned with the existing Grafana app configured by the
// babkenmes/posthog-to-faro branch.
const FARO_APP_NAME = 'layerswap-frontend'

let faroClient: Faro | undefined
let initializationAttempted = false
const walletContextWriters = new WeakMap<Faro, (attributes: Record<string, string>) => boolean>()
let writeSwapContext: ReturnType<typeof createSwapContextWriter> | undefined

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
                version: process.env.NEXT_PUBLIC_FARO_RELEASE || 'unknown-release',
                release: process.env.NEXT_PUBLIC_FARO_RELEASE || 'unknown-release',
                // Retain the existing API-mode field for saved queries/links.
                // Deployment identity is separate, immutable page metadata below.
                environment: process.env.NEXT_PUBLIC_API_VERSION || 'sandbox',
            },
            beforeSend,
            ...getFaroVolumePolicy(process.env.NODE_ENV),
            internalLoggerLevel: process.env.NEXT_PUBLIC_FARO_DEBUG === 'true'
                ? InternalLoggerLevel.VERBOSE
                : InternalLoggerLevel.ERROR,
            pageTracking: {
                generatePageId: location => location.pathname,
                page: {
                    attributes: {
                        deployment_environment: process.env.NEXT_PUBLIC_FARO_DEPLOYMENT || 'unknown',
                    },
                },
            },
            sessionTracking: {
                enabled: true,
                persistent: true,
                samplingRate: parseSamplingRate(process.env.NEXT_PUBLIC_FARO_SAMPLE_RATE),
            },
            experimental: {
                trackNavigation: true,
            },
            instrumentations: [
                new SwapContextInstrumentation(writer => { writeSwapContext = writer }),
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
        writeSwapContext ??= createSwapContextWriter(client.api, listener => client.metas.addListener(listener))
        return writeSwapContext(flattenContext(attributes), options.replaceAttributes ?? false)
    }
    catch (captureError) {
        client.unpatchedConsole.error('[Faro] Failed to set swap session context.', captureError)
        return false
    }
}

/** Replace only wallet-owned fields; do not rotate the session or touch swap data. */
export function setWalletContext(attributes: Record<string, string>): boolean {
    const client = getFaro() ?? initFaro()
    if (!client) return false
    try {
        let write = walletContextWriters.get(client)
        if (!write) {
            write = createWalletContextWriter(client.api, listener => client.metas.addListener(listener))
            walletContextWriters.set(client, write)
        }
        return write(flattenContext(attributes))
    }
    catch {
        // Do not log wallet/provider data or interfere with wallet interactions.
        return false
    }
}

export function setFaroView(name: string): void {
    const client = getFaro() ?? initFaro()
    if (!client) return

    client.api.setView({ name })
}
