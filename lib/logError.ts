import { datadogRum } from "@datadog/browser-rum";

const logError = (message: string) => {
    const error = new Error(message)
    error.name = 'AlertUI';
    error.cause = error;
    datadogRum.addError(error);
}

export default logError;