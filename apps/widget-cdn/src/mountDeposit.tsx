import DepositWidget, { type DepositWidgetProps } from './DepositWidget';
import { mountRoot, type MountHandle } from './mountRoot';

/** Handle returned by `mountDeposit` for updating props or tearing down. */
export type DepositWidgetHandle = MountHandle<DepositWidgetProps>;

/**
 * Imperative mount entry for non-React hosts — the deposit widget.
 *
 * Owns its own React root so the host needs no React at all.
 * Framework-agnostic loaders load this expose (`./mountDeposit`) and call it;
 * React hosts use the `./DepositWidget` expose instead and share the host's
 * React.
 *
 * Only one widget may be live per page (shared with `./mount` — see
 * `mountRoot`): a second mount before the first handle's `destroy()` throws.
 */
export default function mountDeposit(target: HTMLElement, props: DepositWidgetProps): DepositWidgetHandle {
  return mountRoot(DepositWidget, target, props);
}
