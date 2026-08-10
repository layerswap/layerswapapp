import { type ErrorEventType } from '@layerswap/widget-types';

type ErrorLogger = (event: ErrorEventType) => void;

const defaultLogger: ErrorLogger = (event) => {
    console.log('[layerswap:log]', event);
};

let currentLogger: ErrorLogger = defaultLogger;

export function setErrorLogger(logger: ErrorLogger) {
    currentLogger = logger;
}

export function ErrorHandler(event: ErrorEventType) {
    return currentLogger(event);
}
