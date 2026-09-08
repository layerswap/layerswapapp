import Widget, { type WidgetProps } from './Widget';
import { mountRoot, type MountHandle } from './mountRoot';

/** Handle returned by `mount` for updating props or tearing down. */
export type WidgetHandle = MountHandle<WidgetProps>;

/**
 * Imperative mount entry for non-React hosts — the swap widget.
 *
 * Owns its own React root so the host needs no React at all.
 * Framework-agnostic loaders load this expose (`./mount`) and call it; React
 * hosts use the `./Widget` expose instead and share the host's React.
 *
 * Only one widget may be live per page (shared with `./mountDeposit` — see
 * `mountRoot`): a second mount before the first handle's `destroy()` throws.
 */
export default function mount(target: HTMLElement, props: WidgetProps): WidgetHandle {
  return mountRoot(Widget, target, props);
}
