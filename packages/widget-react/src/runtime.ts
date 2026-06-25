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
  // No-op on the server: the MF runtime touches browser globals, and any
  // module-level state set here would otherwise leak across SSR requests.
  if (typeof window === 'undefined') return;
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
        // Mirror the package's peerDependencies range: accept React 18 and 19
        // (the widget relies on 18+ hook semantics) while rejecting 17, where
        // those hooks don't exist. `false` here would silently dedup an
        // incompatible host version.
        shareConfig: { singleton: true, requiredVersion: '^18.0.0 || ^19.0.0' },
      },
      'react-dom': {
        version: (ReactDOM as { version?: string }).version ?? '0.0.0',
        scope: 'default',
        lib: () => ReactDOM,
        // Mirror the package's peerDependencies range: accept React 18 and 19
        // (the widget relies on 18+ hook semantics) while rejecting 17, where
        // those hooks don't exist. `false` here would silently dedup an
        // incompatible host version.
        shareConfig: { singleton: true, requiredVersion: '^18.0.0 || ^19.0.0' },
      },
    },
  });

  initialized = true;
  initializedFor = remoteEntry;
}

export async function loadWidget<T = unknown>(): Promise<T> {
  if (typeof window === 'undefined') {
    throw new Error('[layerswap/widget-react] loadWidget() requires a browser environment');
  }
  const mod = await loadRemote<{ default: T } | T>(`${REMOTE_NAME}/Widget`);
  if (mod && typeof mod === 'object' && 'default' in (mod as Record<string, unknown>)) {
    return (mod as { default: T }).default;
  }
  return mod as T;
}
