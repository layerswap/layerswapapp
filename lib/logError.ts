import posthog from "posthog-js";

const logError = (message: string) => {
    const error = new Error(message + ` env: ${process.env.NEXT_PUBLIC_API_VERSION ?? 'prod'}`)
    error.name = 'AlertUI';
    error.cause = error;
    posthog.captureException(error, {
        $layerswap_exception_type: "Alert UI",
    });
}

export default logError;