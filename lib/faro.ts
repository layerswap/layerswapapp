import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { ReactIntegration } from '@grafana/faro-react';

export function initFaro() {
  if (typeof window === 'undefined') return;

  const collectorUrl = process.env.NEXT_PUBLIC_FARO_COLLECTOR_URL;
  if (!collectorUrl) return;

  return initializeFaro({
    url: collectorUrl,
    app: {
      name: 'layerswap-frontend',
      version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'local',
      environment: process.env.NEXT_PUBLIC_API_VERSION || 'sandbox',
    },
    instrumentations: [
      ...getWebInstrumentations({
        captureConsole: true,
      }),
      new ReactIntegration(),
    ],
  });
}
