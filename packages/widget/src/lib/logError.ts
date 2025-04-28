// import { datadogRum } from "@datadog/browser-rum";
import AppSettings from "./AppSettings";

const logError = (message: string) => {
    const error = new Error(message + ` env: ${AppSettings.ApiVersion ?? 'prod'}`)
    error.name = 'AlertUI';
    error.cause = error;
    // datadogRum.addError(error);
}

export default logError;