import { resolveSource } from './loader.js';
import { initRemote, loadRemoteModule, type SharedLib } from './runtime.js';
import type { WidgetProps, DepositWidgetProps } from './types.js';

/**
 * Handle returned by `mountWidget` / `mountDepositWidget` for updating props
 * or tearing down. Parameterized by the props shape of the mounted widget;
 * defaults to the swap widget's for backward compatibility.
 */
export type WidgetHandle<P = WidgetProps> = {
  /** Re-render the mounted widget with new props. */
  update(props: P): void;
  /** Unmount the widget and release its React root. */
  destroy(): void;
};

/** Handle returned by `mountDepositWidget`. */
export type DepositWidgetHandle = WidgetHandle<DepositWidgetProps>;

/** Signature of the remote's `./mount` / `./mountDeposit` exposes. */
type RemoteMount<P> = (target: HTMLElement, props: P) => WidgetHandle<P>;

export type MountOptions = {
  /**
   * Libraries to share with the remote as MF singletons. Vanilla hosts omit
   * this and the remote uses its own bundled React. React hosts that want to
   * dedup onto their own React should use `@layerswap/widget-react` instead,
   * which wires this up for you.
   */
  shared?: Record<string, SharedLib>;
};

/**
 * Shared plumbing for the mount entries: resolve + verify the manifest, init
 * the MF runtime, and call the requested remote mount expose. The
 * security-critical path (signature check + SRI registration) lives in
 * `resolveSource`, shared with the React loader.
 */
async function mountRemote<P>(
  exposeName: string,
  fnName: string,
  target: HTMLElement,
  props: P,
  options: MountOptions,
): Promise<WidgetHandle<P>> {
  if (typeof window === 'undefined') {
    throw new Error(`[layerswap/widget-js] ${fnName}() requires a browser environment`);
  }
  if (!target) {
    throw new Error(`[layerswap/widget-js] ${fnName}(target, …) requires a DOM element`);
  }
  const { remoteEntry } = await resolveSource();
  initRemote(remoteEntry, options.shared);
  const mount = await loadRemoteModule<RemoteMount<P>>(exposeName);
  return mount(target, props);
}

/**
 * Fetch the Layerswap widget from the CDN and mount it into `target`.
 *
 * Framework-agnostic — works from a plain `<script>`, Vue, Angular, Svelte, or
 * any environment with a DOM. The remote owns its own React root, so the host
 * needs no React.
 *
 * ```js
 * import { mountWidget } from '@layerswap/widget-js';
 *
 * // The widget is always fetched from the canonical Layerswap CDN baked into
 * // this package, with its signature verified — no source configuration.
 * const handle = await mountWidget(
 *   document.getElementById('layerswap'),
 *   { config: { apiKey: 'mainnet' } },
 * );
 * // later …
 * handle.update({ config: { apiKey: 'mainnet', theme: { … } } });
 * handle.destroy();
 * ```
 */
export async function mountWidget(
  target: HTMLElement,
  props: WidgetProps,
  options: MountOptions = {},
): Promise<WidgetHandle> {
  return mountRemote('mount', 'mountWidget', target, props, options);
}

/**
 * Fetch the Layerswap DEPOSIT widget from the CDN and mount it into `target`.
 *
 * The deposit widget funds a single, integrator-fixed destination
 * (network + allowed tokens + recipient address) — the end user only picks a
 * source. Same delivery pipeline and guarantees as `mountWidget`; only one
 * widget (of either kind) may be live per page.
 *
 * ```js
 * import { mountDepositWidget } from '@layerswap/widget-js';
 *
 * const handle = await mountDepositWidget(document.getElementById('layerswap'), {
 *   config: { apiKey: 'mainnet' },
 *   destination: { network: 'BASE_MAINNET', tokens: ['USDC'] },
 *   destinationAddress: '0x…',
 * });
 * ```
 */
export async function mountDepositWidget(
  target: HTMLElement,
  props: DepositWidgetProps,
  options: MountOptions = {},
): Promise<DepositWidgetHandle> {
  return mountRemote('mountDeposit', 'mountDepositWidget', target, props, options);
}
