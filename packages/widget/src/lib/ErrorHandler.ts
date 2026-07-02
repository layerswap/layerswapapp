import { logStore } from "@/stores/logStore";
import { ErrorEventType } from "@/types/logEvents";

export function ErrorHandler(event: ErrorEventType) {
    const { logger } = logStore.getState();;
    return logger(event);
}