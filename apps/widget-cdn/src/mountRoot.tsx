import { ComponentType, createElement } from 'react';
import { createRoot } from 'react-dom/client';

/** Handle returned by the mount exposes for updating props or tearing down. */
export type MountHandle<P> = {
  update(props: P): void;
  destroy(): void;
};

// The widget keeps process-global state (API client key, app settings, the
// extended-route registry), so two live roots would cross-contaminate. Track
// live mounts and fail the second one synchronously — clearer than the
// in-tree fallback that LayerswapProvider renders as a backstop.
//
// The counter is shared across ALL mount exposes (`./mount`, `./mountDeposit`):
// a swap widget and a deposit widget sit on the same global state, so only one
// of either kind may be live per page.
let liveMounts = 0;

/**
 * Imperative mount core for non-React hosts, shared by the `./mount` (swap)
 * and `./mountDeposit` exposes. Owns its own React root so the host needs no
 * React at all; React hosts use the component exposes instead and share the
 * host's React.
 *
 * Only one widget may be live per page: a second mount before the first
 * handle's `destroy()` throws.
 */
export function mountRoot<P extends object>(
  Component: ComponentType<P>,
  target: HTMLElement,
  props: P,
): MountHandle<P> {
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
  root.render(createElement(Component, props));
  let destroyed = false;
  return {
    update(next: P) {
      if (destroyed) {
        throw new Error('[layerswap/widget] update() called on a destroyed widget handle');
      }
      root.render(createElement(Component, next));
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      liveMounts--;
      root.unmount();
    },
  };
}
