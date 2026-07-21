import { logStore } from "@/stores/logStore";
import { ErrorHandler as UtilsErrorHandler, setErrorLogger } from "@layerswap/utils";
import { ErrorEventType } from "@/types/logEvents";

export function registerWidgetErrorLogger() {
    setErrorLogger((event) => logStore.getState().logger(event));
}

export function ErrorHandler(event: ErrorEventType) {
    return UtilsErrorHandler(event);
}