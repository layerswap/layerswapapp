import { type ErrorEventType } from '@layerswap/widget-types';
import { logStore } from "@/stores/logStore";
import { ErrorHandler as UtilsErrorHandler, setErrorLogger } from "@layerswap/widget-types";

export function registerWidgetErrorLogger() {
    setErrorLogger((event) => logStore.getState().logger(event));
}

export function ErrorHandler(event: ErrorEventType) {
    return UtilsErrorHandler(event);
}