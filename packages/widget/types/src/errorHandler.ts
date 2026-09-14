import { type ErrorEventType } from './logEvents';
import { getErrorOccurrenceId } from './errorOccurrence';

type ErrorLogger = (event: ErrorEventType) => void;

const defaultLogger: ErrorLogger = (event) => {
    console.log('[layerswap:log]', event);
};

let currentLogger: ErrorLogger = defaultLogger;

export function setErrorLogger(logger: ErrorLogger) {
    currentLogger = logger;
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
