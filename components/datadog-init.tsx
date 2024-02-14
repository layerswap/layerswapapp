// "use client";

// import { datadogRum } from "@datadog/browser-rum";

// datadogRum.init({
//     applicationId: '855cdf7d-c036-4534-8676-91a8e976a848',
//     clientToken: 'pub6d3ccecf344f429e3a312bd669aa30b6',
//     site: 'datadoghq.com',
//     service: 'layerswapapp',
//     env: process.env.NEXT_PUBLIC_VERCEL_ENV,
//     version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA, 
//     sessionSampleRate: 100,
//     trackUserInteractions: false,
//     trackResources: true,
//     trackLongTasks: true,
//     defaultPrivacyLevel: 'mask-user-input',
// });

export default function DatadogInit() {
    // Render nothing - this component is only included so that the init code
    // above will run client-side
    return null;
}