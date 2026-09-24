import { type ErrorEventType, type ErrorReportInput } from './logEvents';
import { summarizeError, toErrorReport } from './errorReport';

export type ErrorLogger = (event: ErrorEventType) => void;

export const defaultErrorLogger: ErrorLogger = (event) => {
    console.log('[layerswap:log]', toErrorReport(event));
};

export function reportErrorLoggerFailure(event: ErrorEventType, error: unknown) {
    console.error('[layerswap/widget] onError callback failed; falling back to console logging.', summarizeError(error));
    defaultErrorLogger(event);
}

/** Recursion guard and failure fallback; `event` is already a public report. */
function createGuardedLogger(handler: ErrorLogger): ErrorLogger {
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

/** Shared by standalone package consumers and the widget's registration store. */
export function createSafeErrorLogger(handler: ErrorLogger): ErrorLogger {
    const guarded = createGuardedLogger(handler);
    return (event) => guarded(toErrorReport(event));
}

/** Derives a normalized reason from the original error, before it is reduced to a public report. */
export type ErrorClassifier = (event: ErrorReportInput) => ErrorEventType['reasonCode'];

let deliver: ErrorLogger = defaultErrorLogger;
let classify: ErrorClassifier | undefined;

export function setErrorLogger(logger: ErrorLogger) {
    deliver = createGuardedLogger(logger);
}

/** Independent of setErrorLogger: replacing the destination never drops classification. */
export function setErrorClassifier(classifier: ErrorClassifier | undefined) {
    classify = classifier;
}

export function ErrorHandler(event: ErrorReportInput) {
    // Classification and identity use the original error. Only the public report leaves here.
    let reasonCode: ErrorEventType['reasonCode'];
    try { reasonCode = classify?.(event); } catch { /* Optional classification cannot break execution. */ }
    const report = toErrorReport(event);
    if (report.reasonCode === undefined && reasonCode !== undefined) report.reasonCode = reasonCode;
    return deliver(report);
}
