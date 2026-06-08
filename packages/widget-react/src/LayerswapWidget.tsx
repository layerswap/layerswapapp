import {
  ComponentType,
  ReactNode,
  Suspense,
  lazy,
  useMemo,
  useEffect,
  useState,
  Component,
  ErrorInfo,
} from 'react';
import type { Config as WagmiConfig } from 'wagmi';
import type {
  LayerswapWidgetConfig,
  CallbacksContextType,
} from '@layerswap/widget';
import { initRemote, loadWidget } from './runtime';

/**
 * Mirrors the shape of the props the CDN remote's `./Widget` export
 * accepts. Types are imported (type-only — erased at runtime) from
 * `@layerswap/widget` so integrators get full IDE help. The widget package
 * is declared as an *optional* peer dependency — install it as a devDep
 * if you want typed config.
 */
export type RemoteWidgetProps = {
  /**
   * Widget config — apiKey, version, theme, initialValues, settings.
   * Forwarded verbatim to `LayerswapProvider`.
   */
  config?: LayerswapWidgetConfig;
  /**
   * Defaults for the bundled `getDefaultProviders()` call inside the
   * remote (walletConnect projectId, ton manifest, immutablePassport).
   * Structurally typed — see `@layerswap/wallets`' `DefaultWalletConfig`.
   */
  walletDefaults?: {
    walletConnect?: {
      projectId: string;
      name?: string;
      description?: string;
      url?: string;
      icons?: string[];
    };
    ton?: { tonApiKey?: string; manifestUrl?: string };
    immutablePassport?: Record<string, unknown>;
  };
  /**
   * Widget-level event callbacks (onSwapCreate, onSwapComplete, onError,
   * onSwapStatusChange, …). Forwarded to `LayerswapProvider`'s callbacks
   * prop.
   */
  callbacks?: CallbacksContextType;
  /**
   * Host wagmi `Config`. When supplied, the remote widget's EVM provider
   * adopts this instance and the widget reads the host's connected
   * account/chain via the same wagmi store the host already uses.
   */
  wagmiConfig?: WagmiConfig;
};

export type LayerswapWidgetProps = RemoteWidgetProps & {
  /**
   * Full URL to the CDN-hosted `remoteEntry.js`. In production this is
   * `https://cdn.layerswap.io/v1/remoteEntry.js`; in local dev point it
   * at `http://127.0.0.1:3100/remoteEntry.js`.
   */
  remoteEntry: string;
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

function buildLoader(remoteEntry: string): () => Promise<{ default: WidgetComponent }> {
  return async () => {
    initRemote(remoteEntry);
    const Widget = await loadWidget<WidgetComponent>();
    return { default: Widget };
  };
}

export function LayerswapWidget(props: LayerswapWidgetProps) {
  const { remoteEntry, fallback, onReady, onError, ...rest } = props;

  // Re-create the lazy component whenever the remoteEntry URL changes,
  // so swapping channels (e.g. v1 → pinned v1.3.0) doesn't reuse a stale bundle.
  const LazyWidget = useMemo(() => lazy(buildLoader(remoteEntry)), [remoteEntry]);

  return (
    <WidgetErrorBoundary fallback={fallback ?? null} onError={onError}>
      <Suspense fallback={fallback ?? null}>
        <ReadySignal onReady={onReady} />
        <LazyWidget {...(rest as RemoteWidgetProps)} />
      </Suspense>
    </WidgetErrorBoundary>
  );
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  const [fired, setFired] = useState(false);
  useEffect(() => {
    if (fired || !onReady) return;
    onReady();
    setFired(true);
  }, [fired, onReady]);
  return null;
}
