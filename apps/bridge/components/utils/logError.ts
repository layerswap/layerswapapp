import type { ErrorEventType } from '@layerswap/widget-types'
import { captureEvent, captureException } from '../../lib/faro'
import { widgetErrorImpact } from '../../lib/faro-error-policy'

const MAX_DIAGNOSTIC_MESSAGE_LENGTH = 300
const MAX_REPORTED_DIAGNOSTICS = 500
// Background diagnostics repeat on every poll (a failing balance RPC reports each
// refresh), so only the first occurrence per page load is sent.
const reportedDiagnostics = new Set<string>()

// viem appends call arguments and calldata after the first line; the summary is enough to group.
const summarize = (message: unknown) => typeof message === 'string'
    ? message.split('\n', 1)[0].slice(0, MAX_DIAGNOSTIC_MESSAGE_LENGTH)
    : undefined

const summarizeCause = (cause: unknown) => {
    if (cause && typeof cause === 'object') {
        const { name, message } = cause as { name?: unknown; message?: unknown }
        return { name: typeof name === 'string' ? name : undefined, message: summarize(message) }
    }
    return summarize(cause)
}

function isRepeatedDiagnostic(key: string): boolean {
    if (reportedDiagnostics.has(key)) return true
    if (reportedDiagnostics.size >= MAX_REPORTED_DIAGNOSTICS) reportedDiagnostics.clear()
    reportedDiagnostics.add(key)
    return false
}

export const logError = (event: ErrorEventType) => {
    const { message, stack, name, cause, type, occurrenceId, reasonCode, ...details } = event
    const impact = widgetErrorImpact(event)
    if (impact !== 'user') {
        const summary = summarize(message)
        // Addresses and amounts vary per wallet, not per failure.
        const group = summary?.replace(/0x[0-9a-f]+/gi, '0x').replace(/\d+/g, 'N')
        if (isRepeatedDiagnostic(JSON.stringify([type, name, reasonCode, group]))) return
        const captured = captureEvent('widget_diagnostic', {
            ...details, source: 'layerswap-widget', impact, error_category: type,
            error_type: name || type, message: summary, cause: summarizeCause(cause),
            occurrence_id: occurrenceId, reason_code: reasonCode,
        })
        if (!captured) console.info('[layerswap/widget diagnostic]', event)
        return
    }
    const error = new Error(message || type)

    error.name = name || type
    if (stack) error.stack = stack

    const captured = captureException(error, {
        ...details,
        source: 'layerswap-widget',
        eventType: type,
        impact,
        occurrence_id: occurrenceId,
        reason_code: reasonCode,
        cause,
    })

    // Keep a useful local fallback when Faro is intentionally unconfigured or
    // failed to initialize. Avoid console logging after a successful capture,
    // because Faro's console instrumentation would create a duplicate error.
    if (!captured) console.error('[layerswap/widget]', event)
}
