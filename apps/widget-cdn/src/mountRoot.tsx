import { Component, ComponentType, ReactNode, createElement } from 'react';
import { createRoot } from 'react-dom/client';

// The React loader path wraps the widget in remoteWidgetHost's
// WidgetErrorBoundary; this is the equivalent containment for the imperative
// `mount`/`mountDeposit` exposes, where the host has no React tree of its own
// to catch a render-phase crash. On error the widget unrenders (the handle
// stays valid — destroy() still releases the mount slot).
class MountErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidCatch(error: unknown) {
    console.error('[layerswap/widget] widget crashed:', error);
  }
  render() {
    return this.state.error ? null : this.props.children;
  }
}

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
  // must not leave the counter stuck and lock out every future mount. Same for
  // a throwing initial render: release the slot and tear down the root, or the
  // caller never gets a handle to destroy() and every future mount is locked out.
  const root = createRoot(target);
  liveMounts++;
  const renderWidget = (p: P) =>
    root.render(createElement(MountErrorBoundary, null, createElement(Component, p)));
  try {
    renderWidget(props);
  } catch (error) {
    liveMounts--;
    root.unmount();
    throw error;
  }
  let destroyed = false;
  return {
    update(next: P) {
      if (destroyed) {
        throw new Error('[layerswap/widget] update() called on a destroyed widget handle');
      }
      renderWidget(next);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      liveMounts--;
      root.unmount();
    },
  };
}
