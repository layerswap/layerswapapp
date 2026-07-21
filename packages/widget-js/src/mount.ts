import { resolveSource } from './loader.js';
import { initRemote, loadRemoteModule, type SharedLib } from './runtime.js';
import type { WidgetProps } from './types.js';

/** Handle returned by `mountWidget` for updating props or tearing down. */
export type WidgetHandle = {
  /** Re-render the mounted widget with new props. */
  update(props: WidgetProps): void;
  /** Unmount the widget and release its React root. */
  destroy(): void;
};

/** Signature of the remote's `./mount` expose. */
type RemoteMount = (target: HTMLElement, props: WidgetProps) => WidgetHandle;

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
  if (typeof window === 'undefined') {
    throw new Error('[layerswap/widget-js] mountWidget() requires a browser environment');
  }
  if (!target) {
    throw new Error('[layerswap/widget-js] mountWidget(target, …) requires a DOM element');
  }
  const { remoteEntry } = await resolveSource();
  initRemote(remoteEntry, options.shared);
  const mount = await loadRemoteModule<RemoteMount>('mount');
  return mount(target, props);
}
