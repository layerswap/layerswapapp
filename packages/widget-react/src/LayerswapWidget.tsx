import {
  ComponentType,
  ReactNode,
  Suspense,
  lazy,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  Component,
  ErrorInfo,
} from 'react';
import React from 'react';
import ReactDOM from 'react-dom';
import {
  resolveSource,
  initRemote,
  loadRemoteModule,
  type WidgetProps,
  type SharedLib,
} from '@layerswap/widget-js';

/** Wallet provider ids matching what the remote's `getDefaultProviders()` emits. */
export type { WalletProviderId } from '@layerswap/widget-js';

/**
 * Shape of the props the CDN remote's widget export accepts — re-exported
 * from the framework-agnostic core so the React and vanilla packages stay in
 * lockstep.
 */
export type RemoteWidgetProps = WidgetProps;

export type LayerswapWidgetProps = RemoteWidgetProps & {
  // The widget's source is not configurable: it is always fetched from the
  // canonical Layerswap CDN baked into `@layerswap/widget-js`, with its
  // manifest signature verified. This keeps the remote bundle's origin under
  // Layerswap's control rather than the integrator's.
  /** Shown while the remote bundle is being fetched / initialized. */
  fallback?: ReactNode;
  /** Fired once the remote module has loaded and the widget mounts. */
  onReady?: () => void;
  /** Fired when the remote fails to load or throws during render. */
  onError?: (error: unknown) => void;
};

type WidgetComponent = ComponentType<RemoteWidgetProps>;

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

function buildLoader(): () => Promise<{ default: WidgetComponent }> {
  return async () => {
    const { remoteEntry } = await resolveSource();
    initRemote(remoteEntry, hostReactShare());
    const Widget = await loadRemoteModule<WidgetComponent>('Widget');
    return { default: Widget };
  };
}

/**
 * Host-side React loader for the CDN-delivered Layerswap widget.
 *
 * This is a browser-only component — it fetches the remote bundle and inits the
 * Module Federation runtime, both of which require browser globals. In Next.js,
 * import it via `next/dynamic` with `{ ssr: false }` so it never renders on the
 * server:
 *
 * ```ts
 * const LayerswapWidget = dynamic(
 *   () => import('@layerswap/widget-react').then(m => m.LayerswapWidget),
 *   { ssr: false },
 * );
 * ```
 */
export function LayerswapWidget(props: LayerswapWidgetProps) {
  const { fallback, onReady, onError, ...rest } = props;

  // De-dup guard lives on the parent (which persists across `LazyWidget`
  // recreation) rather than inside `ReadySignal`, so `onReady` fires exactly
  // once per physical `LayerswapWidget` mount even if the Suspense subtree
  // re-resolves.
  const onReadyFiredRef = useRef(false);
  const stableOnReady = useCallback(() => {
    if (onReadyFiredRef.current) return;
    onReadyFiredRef.current = true;
    onReady?.();
  }, [onReady]);

  // The remote source is fixed (baked-in CDN), so the lazy factory is built
  // once for the life of the component.
  const LazyWidget = useMemo(() => lazy(buildLoader()), []);

  return (
    <WidgetErrorBoundary fallback={fallback ?? null} onError={onError}>
      <Suspense fallback={fallback ?? null}>
        <ReadySignal onReady={stableOnReady} />
        <LazyWidget {...(rest as RemoteWidgetProps)} />
      </Suspense>
    </WidgetErrorBoundary>
  );
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    // Runs once per Suspense resolve; the parent's ref guard prevents the
    // callback from double-firing across LazyWidget recreation.
    onReady?.();
  }, [onReady]);
  return null;
}
