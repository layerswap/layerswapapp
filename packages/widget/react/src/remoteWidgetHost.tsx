'use client';

import {
  ComponentType,
  ReactNode,
  Suspense,
  lazy,
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
  Component,
  ErrorInfo,
} from 'react';
import React from 'react';
import ReactDOM from 'react-dom';
import { assertRemoteWalletRuntime } from './walletRuntimeShare.js';
import {
  resolveSource,
  initRemote,
  assertSharedLibraries,
  loadRemoteModule,
  type SharedLib,
} from '@layerswap/widget-js';

/**
 * Internal machinery shared by `LayerswapWidget` and `LayerswapDepositWidget`:
 * hydration gating, remote loading via Module Federation, error containment,
 * and the once-per-mount `onReady` signal. The two public components differ
 * only in which remote expose they load and the props they forward.
 */

export type RemoteHostCallbacks = {
  /** Shown while the remote bundle is being fetched / initialized. */
  fallback?: ReactNode;
  /** Fired once the remote module has loaded and the widget mounts. */
  onReady?: () => void;
  /** Fired when the remote fails to load or throws during render. */
  onError?: (error: unknown) => void;
};

/** Internal: only the /wagmi entry point supplies wallet runtime singletons. */
export type WalletRuntimeShare = Record<string, SharedLib>;

class WidgetErrorBoundary extends Component<
  { fallback: ReactNode; onError?: (error: unknown) => void; children: ReactNode },
  { error: unknown }
> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.error) return this.props.fallback ?? null;
    return this.props.children;
  }
}

// Share the host's React/ReactDOM with the remote as MF singletons so the
// widget dedups onto the host's instance instead of bundling its own. The
// range mirrors this package's peerDependencies: accept React 18 and 19 (the
// widget relies on 18+ hook semantics) while rejecting 17, where those hooks
// don't exist. `requiredVersion: false` would silently dedup an incompatible
// host version. Vanilla (non-React) hosts use `@layerswap/widget-js` directly,
// which shares nothing and lets the remote bundle its own React.
function hostReactShare(): Record<string, SharedLib> {
  return {
    react: {
      version: (React as { version?: string }).version ?? '0.0.0',
      lib: () => React,
      requiredVersion: '^18.0.0 || ^19.0.0',
    },
    'react-dom': {
      version: (ReactDOM as { version?: string }).version ?? '0.0.0',
      lib: () => ReactDOM,
      requiredVersion: '^18.0.0 || ^19.0.0',
    },
  };
}

function buildLoader<P>(expose: string, walletShare?: WalletRuntimeShare): () => Promise<{ default: ComponentType<P> }> {
  return async () => {
    const { remoteEntry } = await resolveSource();
    initRemote(remoteEntry, { ...hostReactShare(), ...walletShare });
    if (walletShare) {
      await assertSharedLibraries(walletShare);
      let probe: () => Record<string, unknown>;
      try {
        probe = await loadRemoteModule<() => Record<string, unknown>>('walletRuntime');
      } catch (cause) {
        throw new Error('[layerswap/widget-react] The CDN build does not support the shared wallet runtime. Deploy the matching widget remote before using /wagmi.', { cause });
      }
      assertRemoteWalletRuntime(probe(), walletShare);
    }
    const Widget = await loadRemoteModule<ComponentType<P>>(expose);
    return { default: Widget };
  };
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    // Runs once per Suspense resolve; the parent's ref guard prevents the
    // callback from double-firing across LazyWidget recreation.
    onReady?.();
  }, [onReady]);
  return null;
}

/**
 * Host-side loader for one of the CDN remote's component exposes.
 *
 * Safe to render from anywhere in Next.js — this file declares `"use client"`,
 * so App Router Server Components can render its consumers directly. Because
 * Client Components are still pre-rendered to HTML on the server, it renders
 * `fallback` until hydration completes and only then starts the browser-only
 * work (manifest fetch, Module Federation init).
 */
export function RemoteWidgetHost<P extends object>({
  expose,
  widgetProps,
  walletShare,
  fallback,
  onReady,
  onError,
}: RemoteHostCallbacks & { expose: string; widgetProps: P; walletShare?: WalletRuntimeShare }) {
  // Hydration gate: `mounted` is false during SSR/prerender and the first
  // client render, so server HTML and hydration output agree, and the
  // browser-only loader never runs outside the browser.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // De-dup guard lives on the parent (which persists across Suspense
  // re-resolution) rather than inside `ReadySignal`, so `onReady` fires
  // exactly once per physical widget mount.
  const onReadyFiredRef = useRef(false);
  const stableOnReady = useCallback(() => {
    if (onReadyFiredRef.current) return;
    onReadyFiredRef.current = true;
    onReady?.();
  }, [onReady]);

  // Per-mount, not module scope: `lazy()` caches a rejected loader promise
  // forever, so a module-level instance would turn one transient CDN failure
  // into a page-lifetime one. A fresh `lazy()` per mount lets the integrator
  // recover by remounting; dedup of the underlying fetch is handled by
  // `resolveSource()`'s single-flight, which never caches failures.
  const LazyWidget = useMemo(() => lazy(async () => {
    if (walletShare && (!('wagmiConfig' in widgetProps) || !widgetProps.wagmiConfig)) {
      throw new Error('[layerswap/widget-react] The /wagmi entry point requires the existing host wagmiConfig.');
    }
    if ('wagmiConfig' in widgetProps && widgetProps.wagmiConfig && !walletShare) {
      throw new Error('[layerswap/widget-react] Import the widget from @layerswap/widget-react/wagmi when passing wagmiConfig. This shares the host runtime instead of loading another wagmi instance.');
    }
    return buildLoader<P>(expose, walletShare)();
  }), []);

  if (!mounted) return <>{fallback ?? null}</>;

  return (
    <WidgetErrorBoundary fallback={fallback ?? null} onError={onError}>
      <Suspense fallback={fallback ?? null}>
        <ReadySignal onReady={stableOnReady} />
        <LazyWidget {...widgetProps} />
      </Suspense>
    </WidgetErrorBoundary>
  );
}
