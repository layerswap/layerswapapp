import { datadogRum } from "@datadog/browser-rum";

const logError = (error: Error, details?: { swapId?: string }) => {
    const errorCopy = new Error(error.message)
    errorCopy.name = 'AlertUI'
    errorCopy.stack = error.stack
    datadogRum.addError(errorCopy);
}

export default logError;