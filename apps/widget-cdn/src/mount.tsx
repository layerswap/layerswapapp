import { createRoot } from 'react-dom/client';
import Widget, { type WidgetProps } from './Widget';

/** Handle returned by `mount` for updating props or tearing down. */
export type WidgetHandle = {
  update(props: WidgetProps): void;
  destroy(): void;
};

// The widget keeps process-global state (API client key, app settings, the
// extended-route registry), so two live roots would cross-contaminate. Track
// live mounts and fail the second one synchronously — clearer than the
// in-tree fallback that LayerswapProvider renders as a backstop.
let liveMounts = 0;

/**
 * Imperative mount entry for non-React hosts.
 *
 * Owns its own React root so the host needs no React at all.
 * Framework-agnostic loaders load this expose (`./mount`) and call it; React
 * hosts use the `./Widget` expose instead and share the host's React.
 *
 * Only one widget may be live per page: a second `mount()` before the first
 * handle's `destroy()` throws.
 */
export default function mount(target: HTMLElement, props: WidgetProps): WidgetHandle {
  if (liveMounts > 0) {
    throw new Error(
      '[layerswap/widget] mount() was called while another widget is live. '
      + 'The widget keeps process-global state, so only one widget root may be mounted per page. '
      + 'Call destroy() on the existing handle first.',
    );
  }
  // Claim the slot only after createRoot succeeds — a bad `target` throwing here
  // must not leave the counter stuck and lock out every future mount.
  const root = createRoot(target);
  liveMounts++;
  root.render(<Widget {...props} />);
  let destroyed = false;
  return {
    update(next: WidgetProps) {
      if (destroyed) {
        throw new Error('[layerswap/widget] update() called on a destroyed widget handle');
      }
      root.render(<Widget {...next} />);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      liveMounts--;
      root.unmount();
    },
  };
}
