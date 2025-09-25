import posthog from "posthog-js";
import AppSettings from "./AppSettings";

const logError = (message: string) => {
    const error = new Error(message + ` env: ${AppSettings.ApiVersion ?? 'prod'}`)
    error.name = 'AlertUI';
    error.cause = error;
    posthog.capture('$exception', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        where: 'alertUI',
        severity: 'error',
    });
}

export default logError;