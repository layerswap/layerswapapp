import { init, loadRemote } from '@module-federation/runtime';
import React from 'react';
import ReactDOM from 'react-dom';

const REMOTE_NAME = 'layerswap_widget';

let initialized = false;
let initializedFor: string | null = null;

/**
 * Initialize the MF runtime against a specific remoteEntry URL.
 *
 * Idempotent for a given URL: if called twice with the same URL we no-op.
 * If the URL changes (e.g. dev → prod), we re-init — `@module-federation/runtime`
 * supports re-registering remotes.
 */
export function initRemote(remoteEntry: string): void {
  if (initialized && initializedFor === remoteEntry) return;

  init({
    name: 'layerswap_embed_host',
    remotes: [
      {
        name: REMOTE_NAME,
        entry: remoteEntry,
      },
    ],
    shared: {
      react: {
        version: (React as { version?: string }).version ?? '0.0.0',
        scope: 'default',
        lib: () => React,
        shareConfig: { singleton: true, requiredVersion: false },
      },
      'react-dom': {
        version: (ReactDOM as { version?: string }).version ?? '0.0.0',
        scope: 'default',
        lib: () => ReactDOM,
        shareConfig: { singleton: true, requiredVersion: false },
      },
    },
  });

  initialized = true;
  initializedFor = remoteEntry;
}

export async function loadWidget<T = unknown>(): Promise<T> {
  const mod = await loadRemote<{ default: T } | T>(`${REMOTE_NAME}/Widget`);
  if (mod && typeof mod === 'object' && 'default' in (mod as Record<string, unknown>)) {
    return (mod as { default: T }).default;
  }
  return mod as T;
}
