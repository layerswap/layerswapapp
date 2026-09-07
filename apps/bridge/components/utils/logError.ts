import type { ErrorEventType } from '@layerswap/widget-types'
import { captureException } from '../../lib/faro'

export const logError = (event: ErrorEventType) => {
    const { message, stack, name, cause, type, ...details } = event
    const error = new Error(message || type)

    error.name = name || type
    if (stack) error.stack = stack

    const captured = captureException(error, {
        source: 'layerswap-widget',
        eventType: type,
        cause,
        ...details,
    })

    // Keep a useful local fallback when Faro is intentionally unconfigured or
    // failed to initialize. Avoid console logging after a successful capture,
    // because Faro's console instrumentation would create a duplicate error.
    if (!captured) console.error('[layerswap/widget]', event)
}
