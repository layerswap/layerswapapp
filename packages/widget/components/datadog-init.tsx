// "use client";

import { datadogRum } from "@datadog/browser-rum";

const configs: {
    applicationId: string,
    clientToken: string,
} = process.env.NEXT_PUBLIC_DATADOG_CONFIGS ? JSON.parse(process.env.NEXT_PUBLIC_DATADOG_CONFIGS) : undefined

datadogRum.init({
    applicationId: configs?.applicationId,
    clientToken: configs?.clientToken,
    site: 'datadoghq.com',
    service: 'layerswapuiapp',
    env: process.env.NEXT_PUBLIC_VERCEL_ENV,
    version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    sessionSampleRate: 100,
    trackUserInteractions: false,
    trackResources: false,
    trackLongTasks: true,
    defaultPrivacyLevel: 'mask-user-input',
    beforeSend: (event, context) => {
        if (event.type === 'error') {
            const shouldLog = !event.error.stack?.includes("extension")
                && (event.error.handling == "unhandled"
                    || event.error.causes?.some(c => c.source === "custom"))
                && !knownErrors.some(e => event.error.message.includes(e))
            return !!shouldLog
        }
        return true
    },
});

export default function DatadogInit() {
    // Render nothing - this component is only included so that the init code
    // above will run client-side
    return null;
}

const knownErrors = [
    "'defineProperty' on proxy: trap returned falsish for property 'request'"
]