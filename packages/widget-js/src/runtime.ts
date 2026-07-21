import { init, loadRemote } from '@module-federation/runtime';

const REMOTE_NAME = 'layerswap_widget';
const HOST_NAME = 'layerswap_embed_host';

let initialized = false;
let initializedFor: string | null = null;
let initializedShareKey: string | null = null;

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
 * Idempotent for a given URL: if called twice with the same URL and an
 * equivalent share configuration we no-op. A repeat call for the same URL with
 * a *different* share configuration throws — the MF share scope is already
 * sealed by the first caller, so silently returning would hand the second
 * caller (e.g. a React loader expecting shared React singletons after a
 * vanilla loader initialized with none) a scope it did not ask for.
 * If the URL changes (e.g. dev → prod), we re-init — `@module-federation/runtime`
 * supports re-registering remotes.
 */
export function initRemote(remoteEntry: string, shared?: Record<string, SharedLib>): void {
  if (typeof window === 'undefined') return;
  const shareKey = toShareKey(shared);
  if (initialized && initializedFor === remoteEntry) {
    if (initializedShareKey !== shareKey) {
      throw new Error(
        '[layerswap/widget-js] initRemote() was already called for this remote with a different shared-library configuration. '
        + 'All loaders on a page must agree on the shared scope (e.g. do not mix the vanilla and React loaders against the same remote).',
      );
    }
    return;
  }

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
  initializedShareKey = shareKey;
}

/** Stable signature of a share configuration, for compatibility comparison. */
function toShareKey(shared?: Record<string, SharedLib>): string {
  return JSON.stringify(
    Object.entries(shared ?? {})
      .map(([name, s]) => [name, s.version, s.requiredVersion ?? false])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  );
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
