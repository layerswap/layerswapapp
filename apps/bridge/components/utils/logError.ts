import type { ErrorEventType } from '@layerswap/widget-types'
import { captureEvent, captureException } from '../../lib/faro'
import { widgetErrorImpact } from '../../lib/faro-error-policy'

export const logError = (event: ErrorEventType) => {
    const { message, stack, name, cause, type, occurrenceId, ...details } = event
    const impact = widgetErrorImpact(event)
    if (impact !== 'user') {
        const captured = captureEvent('widget_diagnostic', {
            ...details, source: 'layerswap-widget', impact, error_category: type,
            error_type: name || type, message, stack, cause, occurrence_id: occurrenceId,
        })
        if (!captured) console.info('[layerswap/widget diagnostic]', event)
        return
    }
    const error = new Error(message || type)

    error.name = name || type
    if (stack) error.stack = stack

    const captured = captureException(error, {
        source: 'layerswap-widget',
        eventType: type,
        impact,
        occurrence_id: occurrenceId,
        cause,
        ...details,
    })

    // Keep a useful local fallback when Faro is intentionally unconfigured or
    // failed to initialize. Avoid console logging after a successful capture,
    // because Faro's console instrumentation would create a duplicate error.
    if (!captured) console.error('[layerswap/widget]', event)
}
