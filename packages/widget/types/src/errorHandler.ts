import { type ErrorEventType } from './logEvents';
import { getErrorOccurrenceId } from './errorOccurrence';

export type ErrorLogger = (event: ErrorEventType) => void;

export const defaultErrorLogger: ErrorLogger = (event) => {
    console.log('[layerswap:log]', event);
};

export function reportErrorLoggerFailure(event: ErrorEventType, error: unknown) {
    console.error('[layerswap/widget] onError callback failed; falling back to console logging.', error);
    defaultErrorLogger(event);
}

/** Shared by standalone package consumers and the widget's registration store. */
export function createSafeErrorLogger(handler: ErrorLogger): ErrorLogger {
    let isHandlingError = false;
    return (event) => {
        if (isHandlingError) {
            reportErrorLoggerFailure(event, new Error('Recursive onError callback invocation blocked'));
            return;
        }
        isHandlingError = true;
        try {
            handler(event);
        } catch (error) {
            reportErrorLoggerFailure(event, error);
        } finally {
            isHandlingError = false;
        }
    };
}

let currentLogger: ErrorLogger = defaultErrorLogger;

export function setErrorLogger(logger: ErrorLogger) {
    currentLogger = createSafeErrorLogger(logger);
}

export function ErrorHandler(event: ErrorEventType) {
    return currentLogger({
        ...event,
        // Native Error fields are not enumerable, so spreading alone loses them.
        name: event.name,
        message: event.message,
        stack: event.stack,
        cause: event.cause,
        occurrenceId: event.occurrenceId ?? getErrorOccurrenceId(event),
    });
}
