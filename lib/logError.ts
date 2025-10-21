import posthog from "posthog-js";

const logError = (message: string) => {
    const error = new Error(message + ` env: ${process.env.NEXT_PUBLIC_API_VERSION ?? 'prod'}`)
    error.name = 'AlertUI';
    error.cause = error;
    posthog.capture('$exception', {
        name: error.name,
        message: error.message,
        $layerswap_exception_type: "Alert UI",
        stack: error.stack,
        cause: error.cause,
        where: 'alertUI',
        severity: 'error',
    });
}

export default logError;