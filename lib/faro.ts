import { getWebInstrumentations, initializeFaro, type Faro } from '@grafana/faro-web-sdk';
import { ReactIntegration } from '@grafana/faro-react';

let faro: Faro | null = null;

export function initFaro(): Faro | undefined {
  if (typeof window === 'undefined') return;

  const collectorUrl = process.env.NEXT_PUBLIC_FARO_COLLECTOR_URL;
  if (!collectorUrl) return;

  const instance = initializeFaro({
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

  faro = instance;
  return instance;
}

export function getFaro(): Faro | null {
  return faro;
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  const f = getFaro();
  if (!f) return;

  const err = error instanceof Error ? error : new Error(String(error));
  f.api.pushError(err, {
    context: context ? flattenContext(context) : undefined,
  });
}

export function captureEvent(name: string, attributes?: Record<string, unknown>) {
  const f = getFaro();
  if (!f) return;

  f.api.pushEvent(name, attributes ? flattenContext(attributes) : undefined);
}

export function setUserProperties(properties: Record<string, unknown>) {
  const f = getFaro();
  if (!f) return;

  f.api.setUser({
    attributes: flattenContext(properties),
  });
}

function flattenContext(obj: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    result[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return result;
}
