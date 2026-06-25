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
import { fetchManifest, resolveRemoteEntry, verifyManifest, ManifestError } from './manifest';
import { registerChunkHashes } from './sri';

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
   * Filter/customize the wallet provider set built inside the remote.
   * `exclude: ['tron', 'fuel']` drops those chains from the connect modal.
   */
  walletProvidersConfig?: {
    exclude?: Array<
      | 'evm'
      | 'starknet'
      | 'fuel'
      | 'paradex'
      | 'bitcoin'
      | 'ton'
      | 'svm'
      | 'tron'
      | 'imtblPassport'
    >;
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
   * URL to a `manifest.json` describing the active build. The loader
   * fetches the manifest first, then the `remoteEntry` it points at.
   * Enables atomic rollback, channel pinning, and signature
   * verification. For local development, point this at the widget-cdn
   * dev server's manifest (`http://127.0.0.1:3100/manifest.json`).
   */
  manifest: string;
  /**
   * When true (and `manifest` is set), the loader requires a valid
   * signature on the manifest against the baked-in public key. Manifests
   * without a signature or with an invalid one are rejected. Default
   * false until a real signing key is wired in CI.
   */
  verify?: boolean;
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

type ResolvedSource = { remoteEntry: string };

async function resolveSource(
  props: Pick<LayerswapWidgetProps, 'manifest' | 'verify'>,
): Promise<ResolvedSource> {
  if (!props.manifest) {
    throw new Error('LayerswapWidget: `manifest` is required');
  }
  const manifest = await fetchManifest(props.manifest);
  if (manifest.killSwitch) {
    throw new ManifestError('kill-switch', 'manifest kill switch is set — refusing to load remote');
  }
  if (props.verify) {
    const ok = await verifyManifest(manifest);
    if (!ok) {
      throw new ManifestError('signature', 'manifest signature is missing or invalid');
    }
  }
  const remoteEntry = resolveRemoteEntry(props.manifest, manifest.remoteEntry);
  // Install per-chunk SRI BEFORE MF runtime starts loading scripts. Once
  // the manifest's signed body is trusted, its `chunks` map pins the bytes
  // of every JS file the browser will fetch from our origin — including
  // remoteEntry.js and every lazy chunk loaded later.
  if (manifest.chunks && Object.keys(manifest.chunks).length > 0) {
    registerChunkHashes(remoteEntry, manifest.chunks);
  }
  return { remoteEntry };
}

function buildLoader(props: LayerswapWidgetProps): () => Promise<{ default: WidgetComponent }> {
  return async () => {
    const { remoteEntry } = await resolveSource(props);
    initRemote(remoteEntry);
    const Widget = await loadWidget<WidgetComponent>();
    return { default: Widget };
  };
}

export function LayerswapWidget(props: LayerswapWidgetProps) {
  const { manifest, verify, fallback, onReady, onError, ...rest } = props;

  // Re-create the lazy component when the URL/verify flags change.
  const LazyWidget = useMemo(
    () => lazy(buildLoader(props)),
    // Identity-stable subset — re-build only on real config changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [manifest, verify],
  );

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
