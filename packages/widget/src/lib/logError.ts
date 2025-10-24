import AppSettings from "./AppSettings";
import { useLog } from "@/context/LogProvider";

const logError = (message: string) => {
    const { log } = useLog();
    const error = new Error(message + ` env: ${AppSettings.ApiVersion ?? 'prod'}`)
    error.name = 'AlertUI';
    error.cause = error;

    log({
        type: "$exception",
        props: {
            name: error.name,
            message: error.message,
            $exception_type: "Alert UI",
            stack: error.stack,
            cause: error.cause,
            where: 'alertUI',
            severity: "error",
        },
    });
}

export default logError;