import { init, loadRemote } from '@module-federation/runtime';

const REMOTE_NAME = 'layerswap_widget';
const HOST_NAME = 'layerswap_embed_host';

let initialized = false;
let initializedFor: string | null = null;

/**
 * A library the host wants to share with the remote as a Module Federation
 * singleton. Vanilla hosts share nothing (the remote uses its own bundled
 * copy); React hosts share their React/ReactDOM so the widget dedups onto the
 * host's instance — see `@layerswap/widget-react`.
 */
export type SharedLib = {
  /** The host's resolved version (e.g. `React.version`). */
  version: string;
  /** Returns the actual module instance to share. */
  lib: () => unknown;
  /**
   * Semver range the shared instance must satisfy. Pass a range (e.g.
   * `'^18.0.0 || ^19.0.0'`) to reject an incompatible host version; `false`
   * accepts any version. Defaults to `false`.
   */
  requiredVersion?: string | false;
};

/**
 * Initialize the MF runtime against a specific remoteEntry URL.
 *
 * No-op on the server: the MF runtime touches browser globals, and any
 * module-level state set here would otherwise leak across SSR requests.
 *
 * Idempotent for a given URL: if called twice with the same URL we no-op.
 * If the URL changes (e.g. dev → prod), we re-init — `@module-federation/runtime`
 * supports re-registering remotes.
 */
export function initRemote(remoteEntry: string, shared?: Record<string, SharedLib>): void {
  if (typeof window === 'undefined') return;
  if (initialized && initializedFor === remoteEntry) return;

  type InitArgs = Parameters<typeof init>[0];
  init({
    name: HOST_NAME,
    remotes: [
      {
        name: REMOTE_NAME,
        entry: remoteEntry,
      },
    ],
    shared: (shared ? toShareMap(shared) : {}) as InitArgs['shared'],
  });

  initialized = true;
  initializedFor = remoteEntry;
}

function toShareMap(shared: Record<string, SharedLib>) {
  const out: Record<string, {
    version: string;
    scope: string;
    lib: () => unknown;
    shareConfig: { singleton: boolean; requiredVersion: string | false };
  }> = {};
  for (const [name, s] of Object.entries(shared)) {
    out[name] = {
      version: s.version,
      scope: 'default',
      lib: s.lib,
      shareConfig: { singleton: true, requiredVersion: s.requiredVersion ?? false },
    };
  }
  return out;
}

/**
 * Load a module exposed by the remote (e.g. `'Widget'`, `'mount'`).
 * Unwraps a `default` export if present.
 */
export async function loadRemoteModule<T = unknown>(exposeName: string): Promise<T> {
  if (typeof window === 'undefined') {
    throw new Error('[layerswap/widget-js] loadRemoteModule() requires a browser environment');
  }
  const mod = await loadRemote<{ default: T } | T>(`${REMOTE_NAME}/${exposeName}`);
  if (mod && typeof mod === 'object' && 'default' in (mod as Record<string, unknown>)) {
    return (mod as { default: T }).default;
  }
  return mod as T;
}
